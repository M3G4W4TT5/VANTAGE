using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Vantage.Api.Atlas;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Workspaces;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")))
            Skip = "Set VANTAGE_TEST_CONNECTION, or run node scripts/test-backend.mjs with the Compose database running.";
    }
}

public sealed class WorkspaceTests
{
    [Fact]
    public async Task AtlasV2SelectedResultScopeKeepsLayerReferencesValid()
    {
        var validation = await WorkspaceValidation.LoadAsync(new Dictionary<string, (int Version, string Schema)>
            { ["atlas"] = (2, "AtlasState") });
        const string workspaceId = "step8-scope";
        var template = new AtlasWorkspaceTemplate().Create(workspaceId);
        var root = JsonSerializer.SerializeToNode(template, WorkspaceValidation.Json)!.AsObject();
        var app = root["panes"]![0]!["state"]!.AsObject();
        app["resultScope"] = "selected";
        app["resultLayerIds"] = new JsonArray("aircraft-1");
        app["resultTable"] = "mixed";
        app["sidebarTab"] = "sources";
        var valid = root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!;
        Assert.Null(validation.Validate(workspaceId, 1, valid));

        app["resultLayerIds"] = new JsonArray("missing-layer");
        var invalid = root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!;
        Assert.Contains("result scope", validation.Validate(workspaceId, 1, invalid));
    }

    [Fact]
    public async Task AtlasV2GroupsAndIndependentMapListStateValidateWithoutStartingDemand()
    {
        var validation = await WorkspaceValidation.LoadAsync(new Dictionary<string, (int Version, string Schema)>
            { ["atlas"] = (2, "AtlasState") });
        const string workspaceId = "step8-groups";
        var root = JsonSerializer.SerializeToNode(new AtlasWorkspaceTemplate().Create(workspaceId), WorkspaceValidation.Json)!.AsObject();
        var app = root["panes"]![0]!["state"]!.AsObject();
        var layers = app["layers"]!.AsArray();
        var first = layers[0]!.AsObject();
        first["groupId"] = "group-aircraft";
        first["groupName"] = "Watch aircraft";
        var second = first.DeepClone().AsObject();
        second["id"] = "aircraft-2";
        layers.Add(second);
        app["showMap"] = true;
        app["showList"] = true;
        app["mapListRatio"] = .4;
        app["hiddenMapRecordIds"] = new JsonArray("aircraft-1:fixture-record");
        root["panes"]![0]!["context"]!["layerIds"] = new JsonArray("aircraft-1", "aircraft-2");
        var valid = root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!;
        Assert.Null(validation.Validate(workspaceId, 1, valid));

        second["groupName"] = "Different name";
        Assert.Contains("group members", validation.Validate(workspaceId, 1,
            root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!));
        second["groupName"] = "Watch aircraft";
        app["showMap"] = false; app["showList"] = false;
        Assert.Contains("open map or list", validation.Validate(workspaceId, 1,
            root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!));

        app["showList"] = true;
        layers.Clear();
        app["focusedLayerId"] = "none";
        app["selectedLayerId"] = null;
        root["panes"]![0]!["context"]!["layerIds"] = new JsonArray();
        Assert.Null(validation.Validate(workspaceId, 1,
            root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!));
    }

    [PostgresFact]
    public async Task AtlasV1ReadMigrationPreservesCamerasSelectionsAndDoesNotRewriteUntilSave()
    {
        var adminString = Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")!;
        var database = "vantage_test_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(adminString);
        await admin.OpenAsync();
        await using (var command = new NpgsqlCommand($"CREATE DATABASE {database}", admin)) await command.ExecuteNonQueryAsync();
        var connection = new NpgsqlConnectionStringBuilder(adminString) { Database = database }.ToString();
        try
        {
            string id;
            await using (var app = new TestApp(connection))
            {
                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
                await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
                using var client = await app.CreateAuthorizedClientAsync();
                var created = (await (await client.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Legacy migration")))
                    .Content.ReadFromJsonAsync<WorkspaceDto>())!;
                id = created.Id;
                var root = JsonSerializer.SerializeToNode(new WorkspaceStateDto(created.Panes, created.LinkGroups, created.AppStates),
                    WorkspaceValidation.Json)!.AsObject();
                var pane = root["panes"]![0]!.AsObject();
                pane["stateSchemaVersion"] = 1;
                pane["state"] = new JsonObject
                {
                    ["schemaVersion"] = 1, ["viewMode"] = "canvas", ["resultsOpen"] = true, ["sidebarOpen"] = true,
                    ["inspectorOpen"] = true, ["sidebarWidth"] = 300, ["inspectorWidth"] = 400,
                    ["sort"] = "label", ["expandedDetails"] = false, ["dataMode"] = "live", ["liveView"] = "earthquakes",
                    ["camera"] = new JsonObject { ["longitude"] = 1, ["latitude"] = 2, ["height"] = 1000000 },
                    ["earthquakeCamera"] = new JsonObject { ["longitude"] = 10, ["latitude"] = 20, ["height"] = 2000000 },
                    ["aircraftQuery"] = new JsonObject { ["longitude"] = 11, ["latitude"] = 21, ["radiusNm"] = 100 },
                    ["earthquakeSettings"] = new JsonObject { ["query"] = "Iceland", ["minimumMagnitude"] = 4.0,
                        ["maxAgeHours"] = 24, ["sort"] = "updated" },
                    ["aircraftSelection"] = new JsonObject { ["entityIds"] = new JsonArray("aircraft-old"),
                        ["observationIds"] = new JsonArray("aircraft-observation") }
                };
                var context = pane["context"]!.AsObject();
                context["selection"] = new JsonObject { ["entityIds"] = new JsonArray("quake-current"),
                    ["observationIds"] = new JsonArray("quake-observation") };
                context["layerIds"] = new JsonArray("earthquakes");
                context["filters"] = new JsonObject { ["query"] = "saved aircraft filter", ["freshness"] = "older" };
                var second = pane.DeepClone().AsObject(); second["id"] = "atlas-2";
                second["context"]!["paneId"] = "atlas-2";
                second["state"]!["liveView"] = "aircraft";
                second["context"]!["layerIds"] = new JsonArray("aircraft");
                second["context"]!["selection"] = new JsonObject { ["entityIds"] = new JsonArray(), ["observationIds"] = new JsonArray() };
                root["panes"]!.AsArray().Add(second);
                var original = root.ToJsonString();
                var row = await db.Workspaces.SingleAsync(value => value.Id == id);
                row.StateJson = original; await db.SaveChangesAsync();
                var storedBefore = (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson;

                var migrated = (await client.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{id}"))!;
                Assert.Equal(storedBefore, (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson);
                Assert.All(migrated.Panes, value => Assert.Equal(2, value.StateSchemaVersion));
                using var firstState = JsonDocument.Parse(JsonSerializer.Serialize(migrated.Panes[0].State, WorkspaceValidation.Json));
                var first = firstState.RootElement;
                Assert.Equal(10, first.GetProperty("camera").GetProperty("longitude").GetDouble());
                Assert.Equal(1, first.GetProperty("recovery").GetProperty("inactiveCamera").GetProperty("longitude").GetDouble());
                Assert.Equal("aircraft-old", first.GetProperty("recovery").GetProperty("inactiveSelection").GetProperty("entityIds")[0].GetString());
                Assert.False(first.GetProperty("layers")[0].GetProperty("participating").GetBoolean());
                Assert.True(first.GetProperty("layers")[1].GetProperty("participating").GetBoolean());
                Assert.Equal("Iceland", first.GetProperty("layers")[1].GetProperty("filters").GetProperty("query").GetString());
                Assert.Equal("earthquakes-1", JsonDocument.Parse(JsonSerializer.Serialize(migrated.Panes[0].Context)).RootElement
                    .GetProperty("layerIds")[0].GetString());
                using var secondState = JsonDocument.Parse(JsonSerializer.Serialize(migrated.Panes[1].State, WorkspaceValidation.Json));
                Assert.Equal(1, secondState.RootElement.GetProperty("camera").GetProperty("longitude").GetDouble());
                Assert.True(secondState.RootElement.GetProperty("layers")[0].GetProperty("participating").GetBoolean());
                Assert.Equal("saved aircraft filter", secondState.RootElement.GetProperty("layers")[0].GetProperty("filters").GetProperty("query").GetString());

                var demoLegacy = JsonNode.Parse(storedBefore)!.AsObject();
                demoLegacy["panes"]![1]!["state"]!["dataMode"] = "demo";
                row.StateJson = demoLegacy.ToJsonString(); await db.SaveChangesAsync();
                var demo = (await client.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{id}"))!;
                using var demoState = JsonDocument.Parse(JsonSerializer.Serialize(demo.Panes[1].State, WorkspaceValidation.Json));
                Assert.Equal("demo", demoState.RootElement.GetProperty("recovery").GetProperty("legacyDataMode").GetString());
                Assert.All(demoState.RootElement.GetProperty("layers").EnumerateArray(), layer =>
                    Assert.False(layer.GetProperty("participating").GetBoolean()));
                Assert.Empty(JsonDocument.Parse(JsonSerializer.Serialize(demo.Panes[1].Context)).RootElement.GetProperty("layerIds").EnumerateArray());
                row.StateJson = storedBefore; await db.SaveChangesAsync();

                var invalidLegacy = JsonNode.Parse(storedBefore)!.AsObject();
                invalidLegacy["panes"]![0]!["state"]!["earthquakeCamera"]!["latitude"] = 999;
                row.StateJson = invalidLegacy.ToJsonString(); await db.SaveChangesAsync();
                var preservedLegacy = (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson;
                var invalidResponse = await client.GetAsync($"/api/v1/workspaces/{id}");
                Assert.Equal(HttpStatusCode.UnprocessableEntity, invalidResponse.StatusCode);
                Assert.Contains("original JSON remains", (await invalidResponse.Content.ReadFromJsonAsync<ApiError>())!.Message);
                Assert.Equal(preservedLegacy, (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson);
                row.StateJson = storedBefore; await db.SaveChangesAsync();

                var saved = await client.PutAsJsonAsync($"/api/v1/workspaces/{id}",
                    new UpdateWorkspaceRequest(migrated.Name, migrated.Revision, migrated.SchemaVersion,
                        migrated.Panes, migrated.LinkGroups, migrated.AppStates));
                Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
                using var savedDocument = JsonDocument.Parse((await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson);
                Assert.Equal(2, savedDocument.RootElement.GetProperty("panes")[0].GetProperty("stateSchemaVersion").GetInt32());
            }
            await using (var restarted = new TestApp(connection))
            {
                using var client = await restarted.CreateAuthorizedClientAsync();
                var restored = (await client.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{id}"))!;
                Assert.Equal(2, restored.Panes[0].StateSchemaVersion);
                using var scope = restarted.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
                var row = await db.Workspaces.SingleAsync(value => value.Id == id);
                var invalid = JsonNode.Parse(row.StateJson)!.AsObject();
                invalid["panes"]![0]!["state"]!["camera"]!["latitude"] = 999;
                row.StateJson = invalid.ToJsonString(); await db.SaveChangesAsync();
                var preserved = (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson;
                var response = await client.GetAsync($"/api/v1/workspaces/{id}");
                Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
                Assert.Contains("original JSON remains", (await response.Content.ReadFromJsonAsync<ApiError>())!.Message);
                Assert.Equal(preserved, (await db.Workspaces.AsNoTracking().SingleAsync(value => value.Id == id)).StateJson);
            }
        }
        finally { NpgsqlConnection.ClearAllPools(); await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    [PostgresFact]
    public async Task WorkspaceSurvivesRestartRejectsStaleWritesAndPreservesOriginalOnInvalidState()
    {
        var adminString = Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")!;
        var database = "vantage_test_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(adminString);
        await admin.OpenAsync();
        await using (var command = new NpgsqlCommand($"CREATE DATABASE {database}", admin)) await command.ExecuteNonQueryAsync();
        var connection = new NpgsqlConnectionStringBuilder(adminString) { Database = database }.ToString();
        try
        {
            WorkspaceDto saved;
            await using (var app = new TestApp(connection))
            {
                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
                Assert.Equal(database, db.Database.GetDbConnection().Database);
                await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
                await db.Database.ExecuteSqlRawAsync("SELECT PostGIS_Full_Version()");
                using var client = await app.CreateAuthorizedClientAsync();
                var created = await client.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Initial workspace"));
                Assert.Equal(HttpStatusCode.Created, created.StatusCode);
                var original = (await created.Content.ReadFromJsonAsync<WorkspaceDto>())!;
                var update = new UpdateWorkspaceRequest("Renamed workspace", original.Revision, 1, original.Panes, original.LinkGroups, original.AppStates);
                var response = await client.PutAsJsonAsync($"/api/v1/workspaces/{original.Id}", update);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                saved = (await response.Content.ReadFromJsonAsync<WorkspaceDto>())!;
                Assert.Equal(original.Revision + 1, saved.Revision);
                Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/v1/workspaces/{original.Id}", update)).StatusCode);
                Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/v1/workspaces/{original.Id}", update with { Revision = saved.Revision, SchemaVersion = 999 })).StatusCode);
            }
            await using (var restarted = new TestApp(connection))
            {
                using var client = await restarted.CreateAuthorizedClientAsync();
                var restored = (await client.GetFromJsonAsync<WorkspaceDto>($"/api/v1/workspaces/{saved.Id}"))!;
                Assert.Equal("Renamed workspace", restored.Name); Assert.Equal(saved.Revision, restored.Revision);
                var duplicated = await client.PostAsJsonAsync($"/api/v1/workspaces/{saved.Id}/duplicate", new DuplicateWorkspaceRequest("Independent copy", saved.Revision));
                Assert.Equal(HttpStatusCode.Created, duplicated.StatusCode);
                var copy = (await duplicated.Content.ReadFromJsonAsync<WorkspaceDto>())!;
                Assert.NotEqual(saved.Id, copy.Id);
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/workspaces/{copy.Id}")).StatusCode);
                Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/v1/workspaces/{saved.Id}?revision=1")).StatusCode);
                Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/workspaces/{copy.Id}?revision={copy.Revision}")).StatusCode);
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/workspaces/{saved.Id}")).StatusCode);
            }
        }
        finally { NpgsqlConnection.ClearAllPools(); await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    private sealed class TestApp(string connection) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VantageDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(options => options.UseNpgsql(connection, postgres => postgres.UseNetTopologySuite()));
            services.AddTestIdentity();
        });
    }
}
