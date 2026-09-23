using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Vantage.Api.Atlas;
using Vantage.Api.Connectors.AdsbLol;
using Vantage.Api.Connectors.Usgs;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Platform.Workspaces;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class OwnershipTests
{
    [PostgresFact]
    public async Task LegacyMigrationRequiresConfiguredOwnerAndPreservesEveryStoredValue()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("20260921214038_EarthquakeObservations");
        var timestamp = DateTimeOffset.UtcNow;
        var workspace = JsonSerializer.Serialize(new AtlasWorkspaceTemplate().Create("legacy-valid"), WorkspaceValidation.Json);
        await db.Database.ExecuteSqlInterpolatedAsync($$$"""
            INSERT INTO platform.workspaces ("Id","Name","Revision","SchemaVersion","StateJson","CreatedAt","UpdatedAt")
            VALUES ('legacy-valid','Original workspace',7,1,{{{workspace}}}::jsonb,{{{timestamp}}},{{{timestamp}}}),
                   ('legacy-invalid','Recover original invalid state',3,1,'{"unrecognized":"preserve verbatim"}'::jsonb,{{{timestamp}}},{{{timestamp}}});
            INSERT INTO platform.observations ("Id","EntityId","SourceId","DataType","ObservedAt","RetrievedAt","Position","RecordJson","RawJson")
            VALUES ('obs:aircraft','provider-a:aircraft','provider-a','aircraft',{{{timestamp}}},{{{timestamp}}},ST_SetSRID(ST_MakePoint(179.9,12),4326)::geography,'{"entity":{"kind":"aircraft"},"provenance":{"sourceId":"provider-a","rawRef":"obs:aircraft"}}'::jsonb,'{"raw":"aircraft original"}'::jsonb),
                   ('obs:earthquake','provider-b:quake','provider-b','earthquake',{{{timestamp}}},{{{timestamp}}},ST_SetSRID(ST_MakePoint(-179.9,12),4326)::geography,'{"entity":{"kind":"earthquake"},"provenance":{"sourceId":"provider-b","rawRef":"obs:earthquake"}}'::jsonb,'{"raw":"earthquake original"}'::jsonb);
            INSERT INTO atlas.current_aircraft ("Id","SourceId","OrderTime","RetrievedAt","Position","RecordJson")
            SELECT "EntityId","SourceId","ObservedAt","RetrievedAt","Position","RecordJson" FROM platform.observations WHERE "DataType"='aircraft';
            INSERT INTO atlas.current_earthquakes ("Id","SourceId","OrderTime","OccurredAt","LastSeenAt","InLatestFeed","Position","RecordJson")
            SELECT "EntityId","SourceId","ObservedAt","ObservedAt","RetrievedAt",true,"Position","RecordJson" FROM platform.observations WHERE "DataType"='earthquake';
            INSERT INTO atlas.earthquake_feeds ("SourceId","GeneratedAt","RetrievedAt","Total","Rejected","Truncated")
            VALUES ('provider-b',{{{timestamp}}},{{{timestamp}}},5,2,true);
            """);
        var observationsBefore = await Snapshot(db, "platform.observations");
        var workspacesBefore = await Snapshot(db, "platform.workspaces");
        var aircraftBefore = await Snapshot(db, "atlas.current_aircraft");
        var earthquakesBefore = await Snapshot(db, "atlas.current_earthquakes");
        var feedsBefore = await Snapshot(db, "atlas.earthquake_feeds");

        // The migration itself must fail atomically, including when invoked without the wrapper.
        await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());
        Assert.Equal(workspacesBefore, await Snapshot(db, "platform.workspaces"));
        Assert.Equal(aircraftBefore, await Snapshot(db, "atlas.current_aircraft"));
        Assert.False(await TableExists(db, "platform.users"));

        await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        Assert.Equal(observationsBefore, await Snapshot(db, "platform.observations"));
        Assert.Equal(workspacesBefore, await Snapshot(db, "platform.workspaces", excludeOwner: true));
        Assert.Equal(aircraftBefore, await Snapshot(db, "platform.current_aircraft", excludeConnection: true));
        Assert.Equal(earthquakesBefore, await Snapshot(db, "platform.current_earthquakes", excludeConnection: true));
        Assert.Equal(feedsBefore, await Snapshot(db, "platform.earthquake_feeds", excludeConnection: true));
        foreach (var table in new[] { "atlas.current_aircraft", "atlas.current_earthquakes", "atlas.earthquake_feeds" })
            Assert.False(await TableExists(db, table));
        Assert.All(await db.Workspaces.AsNoTracking().ToListAsync(), row => Assert.Equal(TestIdentity.Owner.Id, row.OwnerId));
        var owner = await db.Users.AsNoTracking().SingleAsync();
        Assert.Equal(TestIdentity.Owner.Subject, owner.Subject); Assert.Equal(TestIdentity.Owner.Issuer, owner.Issuer);

        await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        await Assert.ThrowsAsync<InvalidOperationException>(() => OwnershipMigration.MigrateAsync(db, TestIdentity.Owner with { Subject = "different-subject" }));
        Assert.Single(await db.Users.ToListAsync());
        Assert.Equal(TestIdentity.Owner.Subject, (await db.Users.AsNoTracking().SingleAsync()).Subject);
        Assert.Equal(workspacesBefore, await Snapshot(db, "platform.workspaces", excludeOwner: true));
    }

    [PostgresFact]
    public async Task EveryWorkspaceOperationIsOwnerScopedAndDataPermissionIsIndependent()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            db.Users.Add(new() { Id = "second-owner", Issuer = TestIdentity.Owner.Issuer, Subject = "second-subject", DisplayName = "Second fixture", CanUseData = false });
            db.Users.Add(new() { Id = "disabled-owner", Issuer = TestIdentity.Owner.Issuer, Subject = "disabled-subject", DisplayName = "Disabled fixture", Enabled = false });
            await db.SaveChangesAsync();
        }
        await using var ownerApp = new PlatformTestApp(database.Connection);
        await using var otherApp = new PlatformTestApp(database.Connection, "second-owner");
        using var ownerClient = await ownerApp.CreateAuthorizedClientAsync(); using var otherClient = await otherApp.CreateAuthorizedClientAsync();
        var create = await ownerClient.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Private owner workspace"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var original = (await create.Content.ReadFromJsonAsync<WorkspaceDto>())!;
        Assert.Equal(TestIdentity.Owner.Id, original.OwnerId);
        Assert.Empty((await otherClient.GetFromJsonAsync<WorkspaceSummaryDto[]>("/api/v1/workspaces"))!);
        var update = new UpdateWorkspaceRequest("Attempted overwrite", original.Revision, original.SchemaVersion, original.Panes, original.LinkGroups, original.AppStates);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/v1/workspaces/{original.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.PutAsJsonAsync($"/api/v1/workspaces/{original.Id}", update)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.PostAsJsonAsync($"/api/v1/workspaces/{original.Id}/duplicate", new DuplicateWorkspaceRequest("Stolen copy", original.Revision))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.DeleteAsync($"/api/v1/workspaces/{original.Id}?revision={original.Revision}")).StatusCode);
        Assert.Equal("Private owner workspace", (await ownerClient.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{original.Id}"))!.Name);
        var secondCreate = await otherClient.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Second owner's own workspace"));
        Assert.Equal(HttpStatusCode.Created, secondCreate.StatusCode);
        Assert.Equal("second-owner", (await secondCreate.Content.ReadFromJsonAsync<WorkspaceDto>())!.OwnerId);

        foreach (var path in new[] { "/api/v1/aircraft", "/api/v1/aircraft/source", "/api/v1/aircraft/observations/unknown", "/api/v1/earthquakes", "/api/v1/earthquakes/source", "/api/v1/earthquakes/observations/unknown", "/api/v1/earthquakes/entities/unknown/observations?sourceId=fixture" })
            Assert.Equal(HttpStatusCode.Forbidden, (await otherClient.GetAsync(path)).StatusCode);
        foreach (var deniedId in new[] { "disabled-owner", "unregistered-subject" })
        {
            await using var denied = new PlatformTestApp(database.Connection, deniedId);
            using var client = await denied.CreateAuthorizedClientAsync();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/workspaces")).StatusCode);
        }
    }

    [PostgresFact]
    public async Task PlatformDataAndSavedStateSurviveAtlasUnregistration()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        var now = DateTimeOffset.UtcNow;
        var aircraft = AdsbLolClient.Parse(JsonSerializer.Serialize(new { now = now.ToUnixTimeMilliseconds(), msg = "No error", total = 1, ac = new[] { new { hex = "abcdef", lon = 12, lat = 58, seen = 1, seen_pos = 1 } } }), now, "https://api.adsb.lol/");
        var quakes = UsgsEarthquakeSource.Parse(JsonSerializer.Serialize(new { type = "FeatureCollection", metadata = new { status = 200, count = 1, generated = now.ToUnixTimeMilliseconds() }, features = new[] { new { type = "Feature", id = "independent", geometry = new { type = "Point", coordinates = new[] { 12d, 58, 4 } }, properties = new { time = now.ToUnixTimeMilliseconds(), updated = now.ToUnixTimeMilliseconds(), mag = 3.2, type = "earthquake" } } } }), now);
        WorkspaceDto saved;
        await using (var app = new PlatformTestApp(database.Connection))
        {
            using var scope = app.Services.CreateScope();
            await OwnershipMigration.MigrateAsync(scope.ServiceProvider.GetRequiredService<VantageDbContext>(), TestIdentity.Owner);
            await scope.ServiceProvider.GetRequiredService<AircraftStore>().SaveAsync(aircraft, default);
            await scope.ServiceProvider.GetRequiredService<EarthquakeStore>().SaveAsync(UsgsEarthquakeSource.SourceId, quakes, default);
            using var client = await app.CreateAuthorizedClientAsync();
            saved = (await (await client.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Recoverable ATLAS work"))).Content.ReadFromJsonAsync<WorkspaceDto>())!;
        }
        await using var independent = new PlatformTestApp(database.Connection, atlasEnabled: false);
        using var independentScope = independent.Services.CreateScope();
        Assert.Empty(independentScope.ServiceProvider.GetServices<IWorkspaceTemplate>());
        var consumer = ActivatorUtilities.CreateInstance<IndependentDataConsumer>(independentScope.ServiceProvider, new PlatformAccess(independentScope.ServiceProvider.GetRequiredService<VantageDbContext>(), new TestIdentity.ExplicitSession(TestIdentity.Owner.Id)));
        var (flight, quake) = await consumer.ReadAsync();
        Assert.Equal(aircraft.Records[0].Record.Observation.Id, flight.Observation.Id);
        Assert.Equal(quakes.Records[0].Record.Observation.Id, quake.Observation.Id);
        using var independentClient = await independent.CreateAuthorizedClientAsync();
        Assert.Single((await independentClient.GetFromJsonAsync<AircraftRecordDto[]>("/api/v1/aircraft"))!);
        Assert.Single((await independentClient.GetFromJsonAsync<EarthquakeSnapshotDto>("/api/v1/earthquakes"))!.Records);
        var recovered = (await independentClient.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{saved.Id}"))!;
        Assert.True(JsonNode.DeepEquals(JsonSerializer.SerializeToNode(saved.AppStates), JsonSerializer.SerializeToNode(recovered.AppStates)));
        Assert.True(JsonNode.DeepEquals(JsonSerializer.SerializeToNode(saved.Panes), JsonSerializer.SerializeToNode(recovered.Panes)));
        Assert.Equal(HttpStatusCode.Conflict, (await independentClient.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("No app registered"))).StatusCode);
    }

    [Fact]
    public void PlatformContractsAndServicesDoNotDependOnAtlasTypes()
    {
        var platformTypes = typeof(PlatformAccess).Assembly.GetTypes().Where(t => t.Namespace?.StartsWith("Vantage.Api.Platform", StringComparison.Ordinal) == true).ToArray();
        Assert.NotEmpty(platformTypes);
        foreach (var type in platformTypes)
        {
            var referenced = type.GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SelectMany(c => c.GetParameters().Select(p => p.ParameterType))
                .Concat(type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static).Select(f => f.FieldType))
                .Concat(type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly).SelectMany(m => m.GetParameters().Select(p => p.ParameterType).Append(m.ReturnType)))
                .Concat(type.GetInterfaces());
            foreach (var reference in referenced.SelectMany(ExpandType))
                Assert.False(reference.Namespace?.StartsWith("Vantage.Api.Atlas", StringComparison.Ordinal) == true, $"Platform type {type.FullName} depends on {reference.FullName}.");
        }
    }

    private static IEnumerable<Type> ExpandType(Type type) => new[] { type }.Concat(type.IsGenericType ? type.GetGenericArguments().SelectMany(ExpandType) : []).Concat(type.HasElementType ? ExpandType(type.GetElementType()!) : []);
    private static async Task<string> Snapshot(VantageDbContext db, string table, bool excludeOwner = false, bool excludeConnection = false)
    {
        // Table names are hard-coded by this test, never user input.
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var command = db.Database.GetDbConnection().CreateCommand();
            var row = excludeOwner ? "to_jsonb(t) - 'OwnerId'" : excludeConnection ? "to_jsonb(t) - 'ConnectionId'" : "to_jsonb(t)";
            command.CommandText = $"SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data::text), '[]'::jsonb)::text FROM (SELECT {row} row_data FROM {table} t) rows";
            return (string)(await command.ExecuteScalarAsync())!;
        }
        finally { await db.Database.CloseConnectionAsync(); }
    }
    private static async Task<bool> TableExists(VantageDbContext db, string table)
    {
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var command = new NpgsqlCommand("SELECT to_regclass(@table) IS NOT NULL", (NpgsqlConnection)db.Database.GetDbConnection());
            command.Parameters.AddWithValue("table", table); return (bool)(await command.ExecuteScalarAsync())!;
        }
        finally { await db.Database.CloseConnectionAsync(); }
    }

    // Deliberately consumes only platform capabilities; no ATLAS registration or runtime is needed.
    private sealed class IndependentDataConsumer(PlatformAccess access, AircraftStore aircraft, EarthquakeStore earthquakes, EarthquakeSources sources)
    {
        public async Task<(AircraftRecordDto, EarthquakeRecordDto)> ReadAsync()
        {
            await access.RequireDataAsync(default);
            return (Assert.Single(await aircraft.QueryAsync("adsb-lol", new(), 500, default)), Assert.Single((await earthquakes.QueryAsync(sources.Active.Metadata, default)).Records));
        }
    }

    private sealed class PlatformTestApp(string connection, string? userId = null, bool atlasEnabled = true) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Applications:AtlasEnabled", atlasEnabled.ToString());
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Applications:AtlasEnabled"] = atlasEnabled.ToString() }));
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<VantageDbContext>>(); services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
                services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
                services.AddTestIdentity(userId);
            });
        }
    }
}

internal sealed class IsolatedDatabase(string connection, string database, NpgsqlConnection admin) : IAsyncDisposable
{
    public string Connection => connection;
    public static async Task<IsolatedDatabase> CreateAsync()
    {
        var adminString = Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")!;
        var name = "vantage_test_" + Guid.NewGuid().ToString("N");
        var admin = new NpgsqlConnection(adminString); await admin.OpenAsync();
        await using var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin); await create.ExecuteNonQueryAsync();
        return new(new NpgsqlConnectionStringBuilder(adminString) { Database = name }.ToString(), name, admin);
    }
    public VantageDbContext CreateContext() => new(new DbContextOptionsBuilder<VantageDbContext>().UseNpgsql(connection, pg => pg.UseNetTopologySuite()).Options);
    public async ValueTask DisposeAsync()
    {
        NpgsqlConnection.ClearAllPools();
        await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }
}
