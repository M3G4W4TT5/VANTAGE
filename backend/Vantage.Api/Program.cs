using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NSwag.Generation;
using Vantage.Api.Atlas;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Workspaces;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Connectors.AdsbLol;
using Vantage.Api.Connectors.Usgs;
using Vantage.Api.Connectors.GeoJson;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Connections;

var exportIndex = Array.IndexOf(args, "--export-openapi");
var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.local.json", optional: true)
    .AddEnvironmentVariables();
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 131072);
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new UtcTimestampConverter()))
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = _ =>
    new BadRequestObjectResult(new ApiError("invalid_request", "The request is malformed or missing required fields.")));
builder.Services.AddOpenApiDocument(o => { o.DocumentName = "v1"; o.Title = "VANTAGE API"; o.Version = "1"; });
builder.Services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(
    builder.Configuration.GetConnectionString(args.Contains("--migrate") ? "Vantage" : "VantageRuntime") ?? "Host=127.0.0.1;Port=54329;Database=vantage;Username=vantage_app;Timeout=2",
    pg => pg.UseNetTopologySuite()));
var atlasEnabled = builder.Configuration.GetValue("Applications:AtlasEnabled", true);
builder.Services.AddSingleton(await WorkspaceValidation.LoadAsync(atlasEnabled ? new Dictionary<string, (int, string)> { ["atlas"] = (2, "AtlasState") } : new Dictionary<string, (int, string)>()));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentSession, HttpCurrentSession>();
builder.Services.AddScoped<PlatformAccess>();
builder.Services.AddPlatformAuthentication(builder.Configuration);
builder.Services.AddSingleton(await ObservationValidation.LoadAsync());
builder.Services.AddSingleton(await ConnectorRegistry.LoadAsync());
builder.Services.AddScoped<ConnectionAccess>();
builder.Services.AddScoped<ConnectionSecretStore>();
builder.Services.AddSingleton<ProviderRequestBudget>();
if (atlasEnabled)
{
    builder.Services.AddSingleton<IWorkspaceTemplate, AtlasWorkspaceTemplate>();
    builder.Services.AddSingleton<IWorkspaceStateMigrator, AtlasWorkspaceStateMigrator>();
}
builder.Services.AddHttpClient<AdsbLolClient>(http =>
{
    http.Timeout = TimeSpan.FromSeconds(15);
    http.DefaultRequestHeaders.UserAgent.ParseAdd("VANTAGE-ATLAS/0.2 (local prototype)");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddTransient<IAircraftSource>(sp => sp.GetRequiredService<AdsbLolClient>());
builder.Services.AddSingleton<AircraftSources>();
builder.Services.AddScoped<AircraftStore>();
builder.Services.AddSingleton<AircraftCoordinator>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AircraftCoordinator>());
builder.Services.AddSingleton<IConnectionDemandControl>(sp => sp.GetRequiredService<AircraftCoordinator>());
builder.Services.AddHttpClient<UsgsEarthquakeSource>(http =>
{
    http.Timeout = TimeSpan.FromSeconds(15);
    http.DefaultRequestHeaders.UserAgent.ParseAdd("VANTAGE-ATLAS/0.3 (local prototype)");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddTransient<IEarthquakeSource>(sp => sp.GetRequiredService<UsgsEarthquakeSource>());
builder.Services.AddSingleton<EarthquakeSources>();
builder.Services.AddScoped<EarthquakeStore>();
builder.Services.AddSingleton<EarthquakeCoordinator>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<EarthquakeCoordinator>());
builder.Services.AddSingleton<IConnectionDemandControl>(sp => sp.GetRequiredService<EarthquakeCoordinator>());
builder.Services.AddHttpClient<HttpGeoJsonSource>(http =>
{
    http.Timeout = TimeSpan.FromSeconds(15);
    http.DefaultRequestHeaders.UserAgent.ParseAdd("VANTAGE-ATLAS/0.4 (local prototype)");
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler {
    AllowAutoRedirect = false, UseProxy = false, AutomaticDecompression = System.Net.DecompressionMethods.GZip |
        System.Net.DecompressionMethods.Deflate, ConnectCallback = PublicHttpsDestination.ConnectAsync,
    PooledConnectionLifetime = TimeSpan.FromMinutes(1)
});
builder.Services.AddScoped<GeoJsonStore>();
builder.Services.AddSingleton<GeoJsonCoordinator>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<GeoJsonCoordinator>());
builder.Services.AddSingleton<IConnectionDemandControl>(sp => sp.GetRequiredService<GeoJsonCoordinator>());
builder.Services.AddSignalR(o => { o.MaximumReceiveMessageSize = 16384; o.MaximumParallelInvocationsPerClient = 1; })
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new UtcTimestampConverter()));
var app = builder.Build();
app.Use(async (context, next) =>
{
    RequestSecurity.ApplyResponseHeaders(context);
    try { await next(); }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (PlatformAccessException denied)
    {
        context.Response.StatusCode = denied.Status;
        await context.Response.WriteAsJsonAsync(new ApiError("access_denied", "An authorized VANTAGE session is required."));
    }
    catch (ConnectionUnavailableException unavailable)
    {
        context.Response.StatusCode = 409;
        await context.Response.WriteAsJsonAsync(new ApiError(unavailable.State, "This connection is not available for collection."));
    }
    catch (Npgsql.NpgsqlException)
    {
        context.Response.StatusCode = 503;
        await context.Response.WriteAsJsonAsync(new ApiError("storage_unavailable", "Local storage is unavailable. Check the database and migrations, then retry.", true));
    }
});
// The public sign-in shell must load before an authenticated session exists.
// Only built, public frontend assets are served from wwwroot.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(RequestSecurity.Enforce);
app.UseAuthorization();
app.MapControllers();
app.MapHub<ObservationsHub>("/hubs/observations").RequireAuthorization();
if (exportIndex >= 0)
{
    var document = await app.Services.GetRequiredService<IOpenApiDocumentGenerator>().GenerateAsync("v1");
    await File.WriteAllTextAsync(args[exportIndex + 1], document.ToJson());
    return;
}
if (args.Contains("--migrate"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await OwnershipMigration.MigrateAsync(scope.ServiceProvider.GetRequiredService<VantageDbContext>(),
        InitialOperator.FromConfiguration(builder.Configuration), config: builder.Configuration);
    return;
}
app.UseOpenApi(o => o.Path = "/api/openapi/{documentName}.json");
app.MapFallback(async context =>
{
    var index = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
    if (context.Request.Path.StartsWithSegments("/api") || !File.Exists(index)) { context.Response.StatusCode = 404; return; }
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(index);
}).AllowAnonymous();
app.Run();

public partial class Program;
