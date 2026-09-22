using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
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
