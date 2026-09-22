using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Vantage.Api.Atlas;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Workspaces;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class PreferencesTests
{
    [PostgresFact]
    public async Task MigrationAndApiKeepPersonalThemeSeparateFromSavedWorkspacesAndOtherUsers()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        var olderTime = DateTimeOffset.UtcNow.AddDays(-1);
        var newerTime = olderTime.AddHours(1);
        var older = new AtlasWorkspaceTemplate().Create("older");
        var newer = new AtlasWorkspaceTemplate().Create("newer");
        newer.AppStates["shell"] = new { theme = "light", activePaneId = "atlas-1" };
        var olderJson = JsonSerializer.Serialize(older, WorkspaceValidation.Json);
        var newerJson = JsonSerializer.Serialize(newer, WorkspaceValidation.Json);

        await using (var db = database.CreateContext())
        {
            await db.GetService<IMigrator>().MigrateAsync("20260921214038_EarthquakeObservations");
            await db.Database.ExecuteSqlInterpolatedAsync($$$"""
                INSERT INTO platform.workspaces ("Id","Name","Revision","SchemaVersion","StateJson","CreatedAt","UpdatedAt")
                VALUES ('older','Earlier saved view',4,1,{{{olderJson}}}::jsonb,{{{olderTime}}},{{{olderTime}}}),
                       ('newer','Later saved view',7,1,{{{newerJson}}}::jsonb,{{{newerTime}}},{{{newerTime}}});
                """);
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            var backfilled = await db.PersonalPreferences.AsNoTracking().SingleAsync();
            Assert.Equal((TestIdentity.Owner.Id, "light", 1), (backfilled.UserId, backfilled.Theme, backfilled.Revision));
            var savedWorkspaces = await db.Workspaces.AsNoTracking().OrderBy(w => w.UpdatedAt).ToArrayAsync();
            Assert.Equal(new long[] { 4, 7 }, savedWorkspaces.Select(w => w.Revision));
            using var earlierState = JsonDocument.Parse(savedWorkspaces[0].StateJson);
            using var laterState = JsonDocument.Parse(savedWorkspaces[1].StateJson);
            Assert.Equal("dark", earlierState.RootElement.GetProperty("appStates").GetProperty("shell").GetProperty("theme").GetString());
            Assert.Equal("light", laterState.RootElement.GetProperty("appStates").GetProperty("shell").GetProperty("theme").GetString());
            db.Users.Add(new PlatformUserRow { Id = "second-owner", Issuer = TestIdentity.Owner.Issuer,
                Subject = "second-subject", DisplayName = "Second fixture", CanUseData = false });
            await db.SaveChangesAsync();
        }

        await using var ownerApp = new PreferencesApp(database.Connection);
        await using var otherApp = new PreferencesApp(database.Connection, "second-owner");
        using var owner = await ownerApp.CreateAuthorizedClientAsync();
        using var other = await otherApp.CreateAuthorizedClientAsync();
        using var anonymous = ownerApp.CreateClient(new() { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/preferences")).StatusCode);

        var migrated = (await owner.GetFromJsonAsync<PersonalPreferencesDto>("/api/v1/preferences"))!;
        Assert.Equal((1, "light", 1), (migrated.SchemaVersion, migrated.Theme, migrated.Revision));
        var missing = (await other.GetFromJsonAsync<PersonalPreferencesDto>("/api/v1/preferences"))!;
        Assert.Equal((1, "dark", 0), (missing.SchemaVersion, missing.Theme, missing.Revision));
        Assert.Null(missing.UpdatedAt);

        var otherSave = await other.PutAsJsonAsync("/api/v1/preferences", new UpdatePersonalPreferencesRequest("dark", missing.Revision));
        Assert.Equal(HttpStatusCode.OK, otherSave.StatusCode);
        Assert.Equal(1, (await otherSave.Content.ReadFromJsonAsync<PersonalPreferencesDto>())!.Revision);
        Assert.Equal("light", (await owner.GetFromJsonAsync<PersonalPreferencesDto>("/api/v1/preferences"))!.Theme);

        var updated = await owner.PutAsJsonAsync("/api/v1/preferences", new UpdatePersonalPreferencesRequest("dark", migrated.Revision));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var changed = (await updated.Content.ReadFromJsonAsync<PersonalPreferencesDto>())!;
        Assert.Equal(("dark", 2), (changed.Theme, changed.Revision));
        var stale = await owner.PutAsJsonAsync("/api/v1/preferences", new UpdatePersonalPreferencesRequest("light", migrated.Revision));
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("revision_conflict", (await stale.Content.ReadFromJsonAsync<ApiError>())!.Code);
        var invalid = await owner.PutAsJsonAsync("/api/v1/preferences", new UpdatePersonalPreferencesRequest("sepia", 2));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal("invalid_theme", (await invalid.Content.ReadFromJsonAsync<ApiError>())!.Code);
        Assert.Equal("dark", (await owner.GetFromJsonAsync<PersonalPreferencesDto>("/api/v1/preferences"))!.Theme);

        await using var restarted = new PreferencesApp(database.Connection);
        using var restoredClient = await restarted.CreateAuthorizedClientAsync();
        var restored = (await restoredClient.GetFromJsonAsync<PersonalPreferencesDto>("/api/v1/preferences"))!;
        Assert.Equal(("dark", 2), (restored.Theme, restored.Revision));
        using var unchangedScope = restarted.Services.CreateScope();
        var workspaces = await unchangedScope.ServiceProvider.GetRequiredService<VantageDbContext>()
            .Workspaces.AsNoTracking().OrderBy(w => w.UpdatedAt).ToArrayAsync();
        using var unchangedState = JsonDocument.Parse(workspaces[1].StateJson);
        Assert.Equal("light", unchangedState.RootElement.GetProperty("appStates").GetProperty("shell").GetProperty("theme").GetString());
    }

    private sealed class PreferencesApp(string connection, string? userId = null) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VantageDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(options => options.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
            services.AddTestIdentity(userId);
        });
    }
}
