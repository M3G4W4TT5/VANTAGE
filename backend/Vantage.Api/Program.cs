using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NSwag.Generation;
using Vantage.Api.Atlas;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Workspaces;

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
    builder.Configuration.GetConnectionString("Vantage") ?? "Host=127.0.0.1;Port=54329;Database=vantage;Username=vantage;Timeout=2",
    pg => pg.UseNetTopologySuite()));
builder.Services.AddSingleton(await WorkspaceValidation.LoadAsync(new Dictionary<string, (int, string)> { ["atlas"] = (1, "AtlasState") }));
builder.Services.AddSingleton<IWorkspaceTemplate, AtlasWorkspaceTemplate>();
var app = builder.Build();
app.Use(async (context, next) =>
{
    try { await next(); }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (Npgsql.NpgsqlException)
    {
        context.Response.StatusCode = 503;
        await context.Response.WriteAsJsonAsync(new ApiError("storage_unavailable", "Workspace storage is unavailable. Check the database and migrations, then retry.", true));
    }
});
app.MapControllers();
if (exportIndex >= 0)
{
    var document = await app.Services.GetRequiredService<IOpenApiDocumentGenerator>().GenerateAsync("v1");
    await File.WriteAllTextAsync(args[exportIndex + 1], document.ToJson());
    return;
}
if (args.Contains("--migrate"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<VantageDbContext>().Database.MigrateAsync();
    return;
}
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseOpenApi(o => o.Path = "/api/openapi/{documentName}.json");
app.MapFallback(async context =>
{
    var index = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
    if (context.Request.Path.StartsWithSegments("/api") || !File.Exists(index)) { context.Response.StatusCode = 404; return; }
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(index);
});
app.Run();

public partial class Program;
