using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class ConnectionTests
{
    private static JsonElement Settings(int pollSeconds) => JsonSerializer.SerializeToElement(new { pollSeconds });

    [PostgresFact]
    public async Task MigrationAndApiPreserveEditsDeletionScopeAndPortableDefinitions()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            Assert.Equal(2, await db.Connections.CountAsync());
            Assert.Equal(2, await db.Datasets.CountAsync());
            Assert.All(await db.Connections.ToArrayAsync(), row => Assert.Equal(TestIdentity.Owner.Id, row.OwnerId));
            Assert.Equal(BuiltinConnections.Aircraft, (await db.CurrentAircraft.FirstOrDefaultAsync())?.ConnectionId ?? BuiltinConnections.Aircraft);
            db.Users.Add(new() { Id = "other-owner", Issuer = TestIdentity.Owner.Issuer,
                Subject = "other-subject", DisplayName = "Other fixture", CanUseData = true });
            await db.SaveChangesAsync();
        }
        await using var app = new ConnectionApp(database.Connection);
        using var owner = await app.CreateAuthorizedClientAsync();
        using var other = (await TestIdentity.IssueAsync(app, "other-owner")).Client;
        using var anonymous = app.CreateClient(new() { AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/connections")).StatusCode);
        Assert.Empty((await other.GetFromJsonAsync<ConnectionDto[]>("/api/v1/connections"))!);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync("/api/v1/connections/" + BuiltinConnections.Aircraft)).StatusCode);

        var types = (await owner.GetFromJsonAsync<ConnectorTypeDto[]>("/api/v1/connections/connector-types"))!;
        Assert.Equal(2, types.Length);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync(types[0].SettingsSchemaUrl)).StatusCode);
        var templates = (await owner.GetFromJsonAsync<ConnectionTemplateDto[]>("/api/v1/connections/templates"))!;
        Assert.Equal(2, templates.Length);

        var workspaceResponse = await owner.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Scoped target"));
        Assert.Equal(HttpStatusCode.Created, workspaceResponse.StatusCode);
        var workspace = (await workspaceResponse.Content.ReadFromJsonAsync<WorkspaceDto>())!;
        var create = new CreateConnectionRequest("Second aircraft", "adsb-lol", "adsb-lol-default", 1,
            Settings(30), "workspace", workspace.Id);
        var createdResponse = await owner.PostAsJsonAsync("/api/v1/connections", create);
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = (await createdResponse.Content.ReadFromJsonAsync<ConnectionDto>())!;
        Assert.Equal((1, "workspace", workspace.Id), (created.Revision, created.Scope, created.WorkspaceId));
        Assert.Single(created.Datasets);
        Assert.Equal(HttpStatusCode.Forbidden, (await owner.GetAsync("/api/v1/aircraft?connectionId=" + created.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync("/api/v1/aircraft?connectionId=" + created.Id +
            "&workspaceId=" + workspace.Id)).StatusCode);

        var invalid = await owner.PutAsJsonAsync("/api/v1/connections/" + created.Id,
            new UpdateConnectionRequest("Invalid", created.Revision, 1, Settings(5), "workspace", workspace.Id, true));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal("Second aircraft", (await owner.GetFromJsonAsync<ConnectionDto>("/api/v1/connections/" + created.Id))!.Name);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PutAsJsonAsync("/api/v1/connections/" + created.Id,
            new UpdateConnectionRequest("Cadence override", created.Revision, 1, Settings(60), "workspace", workspace.Id, true))).StatusCode);
        var changedResponse = await owner.PutAsJsonAsync("/api/v1/connections/" + created.Id,
            new UpdateConnectionRequest("Edited aircraft", created.Revision, 1, Settings(30), "workspace", workspace.Id, true));
        Assert.Equal(HttpStatusCode.OK, changedResponse.StatusCode);
        var changed = (await changedResponse.Content.ReadFromJsonAsync<ConnectionDto>())!;
        Assert.Equal(2, changed.Revision);
        Assert.Equal(HttpStatusCode.Conflict, (await owner.PutAsJsonAsync("/api/v1/connections/" + created.Id,
            new UpdateConnectionRequest("Stale", created.Revision, 1, Settings(30), "global", null, true))).StatusCode);

        var duplicateResponse = await owner.PostAsJsonAsync("/api/v1/connections/" + created.Id + "/duplicate",
            new DuplicateConnectionRequest("Third aircraft", changed.Revision));
        Assert.Equal(HttpStatusCode.Created, duplicateResponse.StatusCode);
        var duplicate = (await duplicateResponse.Content.ReadFromJsonAsync<ConnectionDto>())!;
        Assert.NotEqual(created.Id, duplicate.Id);
        Assert.Equal(changed.Settings.GetRawText(), duplicate.Settings.GetRawText());

        var exported = (await owner.GetFromJsonAsync<ConnectionImportRequest>("/api/v1/connections/export"))!;
        Assert.Equal(1, exported.SchemaVersion);
        Assert.Equal(4, exported.Connections.Length);
        var exportedText = JsonSerializer.Serialize(exported);
        Assert.DoesNotContain("credentialRef", exportedText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ciphertext", exportedText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(created.Id, exportedText);
        var malicious = JsonSerializer.SerializeToElement(new { schemaVersion = 1, connections = new[] {
            new { schemaVersion = 1, connectorTypeId = "adsb-lol", name = "Reject secret", scope = "global",
                enabled = true, settings = new { pollSeconds = 30 }, requiresCredential = false, credential = "must-reject" } } });
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/v1/connections/import", malicious)).StatusCode);
        var portable = new ConnectionImportRequest(1, [new(1, "adsb-lol", "Imported unresolved",
            "global", null, true, Settings(30), true)]);
        var importedResponse = await owner.PostAsJsonAsync("/api/v1/connections/import", portable);
        Assert.Equal(HttpStatusCode.OK, importedResponse.StatusCode);
        var imported = Assert.Single((await importedResponse.Content.ReadFromJsonAsync<ConnectionImportResultDto>())!.Connections);
        Assert.Equal("setup_required", imported.Status);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PutAsJsonAsync("/api/v1/connections/" + imported.Id +
            "/credential", new ConnectionCredentialRequest(imported.Revision, "example-token"))).StatusCode);

        var observedAt = DateTimeOffset.UtcNow;
        var feed = JsonSerializer.Serialize(new { now = observedAt.ToUnixTimeMilliseconds(), msg = "No error", total = 1,
            ac = new[] { new { hex = "abcdee", lon = 12, lat = 58, seen = 1, seen_pos = 1 } } });
        var retained = Vantage.Api.Connectors.AdsbLol.AdsbLolClient.Parse(feed, observedAt,
            "https://api.adsb.lol/v2/point/58/12/250");
        await using (var storage = database.CreateContext())
            await new AircraftStore(storage, await ObservationValidation.LoadAsync()).SaveAsync(retained, default,
                created.Id, created.Datasets[0].Id, changed.Revision);
        var evidencePath = "/api/v1/aircraft/observations/" + retained.Records[0].Record.Observation.Id;
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync(evidencePath)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync(evidencePath + "?workspaceId=" + workspace.Id)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync("/api/v1/connections/" + created.Id +
            "?revision=" + changed.Revision)).StatusCode);
        Assert.Equal("removed", (await owner.GetFromJsonAsync<ConnectionDto>("/api/v1/connections/" + created.Id))!.Status);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync(evidencePath + "?workspaceId=" + workspace.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync("/api/v1/workspaces/" + workspace.Id +
            "?revision=" + workspace.Revision)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync(evidencePath + "?workspaceId=" + workspace.Id)).StatusCode);
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        await using var restarted = new ConnectionApp(database.Connection);
        using var restored = await restarted.CreateAuthorizedClientAsync();
        var rows = (await restored.GetFromJsonAsync<ConnectionDto[]>("/api/v1/connections"))!;
        Assert.Equal(5, rows.Length);
        Assert.Equal("removed", rows.Single(x => x.Id == created.Id).Status);
        Assert.Equal("Edited aircraft", rows.Single(x => x.Id == created.Id).Name);
        Assert.Equal("setup_required", rows.Single(x => x.Id == imported.Id).Status);
    }

    [PostgresFact]
    public async Task ConnectionScopedStorageSharesObservationIdentityAndRetainsAcquisitionLineage()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var second = new ConnectionRow { Id = "second-aircraft", OwnerId = TestIdentity.Owner.Id, Name = "Second",
            ConnectorTypeId = "adsb-lol", SettingsJson = "{\"pollSeconds\":45}",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        db.Connections.Add(second);
        db.Datasets.Add(new() { Id = "second-aircraft:positions", ConnectionId = second.Id, ProductId = "positions",
            SourceId = "adsb-lol", Domain = "aircraft", MetadataJson = "{}" });
        await db.SaveChangesAsync();
        var now = DateTimeOffset.UtcNow;
        var payload = JsonSerializer.Serialize(new { now = now.ToUnixTimeMilliseconds(), msg = "No error", total = 1,
            ac = new[] { new { hex = "abcdef", lon = 12, lat = 58, seen = 1, seen_pos = 1 } } });
        var fetch = Vantage.Api.Connectors.AdsbLol.AdsbLolClient.Parse(payload, now, "https://api.adsb.lol/v2/point/58/12/250");
        var store = new AircraftStore(db, await ObservationValidation.LoadAsync());
        await store.SaveAsync(fetch, default);
        await store.SaveAsync(fetch, default, second.Id, "second-aircraft:positions", second.Revision);
        Assert.Single(await db.Observations.ToArrayAsync());
        Assert.Equal(2, await db.ObservationDeliveries.CountAsync());
        await store.SaveAsync(fetch, default, second.Id, "second-aircraft:positions", second.Revision + 1);
        Assert.Equal(3, await db.ObservationDeliveries.CountAsync());
        Assert.Equal(2, await db.CurrentAircraft.CountAsync());
        Assert.Single(await store.QueryAsync("adsb-lol", new(), 500, default, second.Id));
        var id = fetch.Records[0].Record.Observation.Id;
        Assert.All(await db.ObservationDeliveries.ToArrayAsync(), link => Assert.Equal(id, link.ObservationId));
        Assert.Equal("adsb-lol", (await db.Observations.SingleAsync()).SourceId);
    }

    [PostgresFact]
    public async Task SecretValuesAreEncryptedAndScopedWithoutEnteringPortableConfiguration()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var key = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Connections:EncryptionKey"] = key }).Build();
        var store = new ConnectionSecretStore(db, config);
        var connection = await db.Connections.SingleAsync(x => x.Id == BuiltinConnections.Aircraft);
        var reference = await store.SetAsync(connection, "fixture-credential", default);
        connection.CredentialRef = reference; await db.SaveChangesAsync();
        Assert.Equal("fixture-credential", await store.ResolveAsync(connection, default));
        var encrypted = await db.ConnectionSecrets.SingleAsync();
        Assert.DoesNotContain("fixture-credential", Convert.ToHexString(encrypted.Ciphertext));
        Assert.DoesNotContain("fixture-credential", connection.SettingsJson);
        var wrong = new ConnectionRow { Id = BuiltinConnections.Earthquakes, CredentialRef = reference };
        Assert.Null(await store.ResolveAsync(wrong, default));
    }

    [PostgresFact]
    public async Task EquivalentPaneDemandSharesOneFetchAndDisableCancelsOnlyItsConnection()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        ConnectionRow primary, independent;
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            primary = await db.Connections.AsNoTracking().SingleAsync(x => x.Id == BuiltinConnections.Aircraft);
            independent = new ConnectionRow { Id = "independent-aircraft", OwnerId = TestIdentity.Owner.Id,
                Name = "Independent", ConnectorTypeId = "adsb-lol", SettingsJson = "{\"pollSeconds\":45}",
                CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            db.Connections.Add(independent);
            db.Datasets.Add(new() { Id = "independent-aircraft:positions", ConnectionId = independent.Id,
                ProductId = "positions", SourceId = "adsb-lol", Domain = "aircraft", MetadataJson = "{}" });
            await db.SaveChangesAsync();
        }
        var source = new BlockingAircraftSource();
        await using var app = new ConnectionApp(database.Connection, source);
        using var client = await app.CreateAuthorizedClientAsync();
        var coordinator = app.Services.GetRequiredService<AircraftCoordinator>();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(12));
        await using var first = coordinator.Subscribe(new(), timeout.Token, primary).GetAsyncEnumerator();
        await using var second = coordinator.Subscribe(new(), timeout.Token, primary).GetAsyncEnumerator();
        await using var third = coordinator.Subscribe(new(), timeout.Token, independent).GetAsyncEnumerator();
        Assert.True(await first.MoveNextAsync());
        Assert.True(await second.MoveNextAsync());
        Assert.True(await third.MoveNextAsync());
        Assert.Equal(first.Current.SubscriptionId, second.Current.SubscriptionId);
        Assert.NotEqual(first.Current.SubscriptionId, third.Current.SubscriptionId);
        await source.Started.Task.WaitAsync(timeout.Token);
        Assert.Equal(1, source.Requests);
        var activeStatus = (await client.GetFromJsonAsync<ConnectionStatusDto>("/api/v1/connections/" + primary.Id + "/status"))!;
        Assert.Equal(1, activeStatus.ActiveOperations);
        Assert.Equal(2, activeStatus.ActiveConsumers);
        Assert.Equal("loading", activeStatus.HealthState);
        Assert.Null(activeStatus.CachedRetrievedAt);
        var disabled = await client.PutAsJsonAsync("/api/v1/connections/" + primary.Id,
            new UpdateConnectionRequest(primary.Name, primary.Revision, 1, Settings(30), "global", null, false));
        Assert.Equal(HttpStatusCode.OK, disabled.StatusCode);
        while (await first.MoveNextAsync()) { }
        while (await second.MoveNextAsync()) { }
        await source.Cancelled.Task.WaitAsync(timeout.Token);
        var disabledStatus = (await client.GetFromJsonAsync<ConnectionStatusDto>("/api/v1/connections/" + primary.Id + "/status"))!;
        Assert.Equal("disabled", disabledStatus.HealthState);
        Assert.Equal(0, disabledStatus.ActiveConsumers);
        Assert.False(third.Current.Health.State == "disabled");
    }

    [PostgresFact]
    public async Task StatusAndDraftPreviewAreReadOnlyUntilExplicitProviderTest()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            db.CurrentAircraft.Add(new() { ConnectionId = BuiltinConnections.Aircraft, Id = "cached-fixture",
                SourceId = "adsb-lol", RetrievedAt = DateTimeOffset.UtcNow.AddMinutes(-4) });
            await db.SaveChangesAsync();
        }
        var source = new CountingAircraftSource();
        await using var app = new ConnectionApp(database.Connection, source);
        using var client = await app.CreateAuthorizedClientAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync(
            "/api/v1/connections/" + BuiltinConnections.Aircraft + "/status")).StatusCode);
        var status = (await client.GetFromJsonAsync<ConnectionStatusDto>(
            "/api/v1/connections/" + BuiltinConnections.Aircraft + "/status"))!;
        Assert.Equal("not_checked", status.HealthState);
        Assert.Equal(0, status.ActiveOperations);
        Assert.Equal(0, status.ActiveConsumers);
        Assert.Equal(1, status.CachedRecords);
        Assert.NotNull(status.CachedRetrievedAt);
        Assert.Equal(0, source.Requests);

        var response = await client.PostAsJsonAsync("/api/v1/connections/preview",
            new ConnectionPreviewRequest("adsb-lol", 1, Settings(30)));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var preview = (await response.Content.ReadFromJsonAsync<ConnectionTestDto>())!;
        Assert.True(preview.Valid);
        Assert.Empty(preview.PreviewRows);
        Assert.Equal(1, source.Requests);
        await using var check = database.CreateContext();
        Assert.Empty(await check.Observations.ToArrayAsync());
        Assert.Equal(2, await check.Connections.CountAsync());
    }

    [PostgresFact]
    public async Task UnavailableProviderStatusAndPreviewDoNotClaimHealthOrFetch()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var source = new CountingAircraftSource(enabled: false);
        await using var app = new ConnectionApp(database.Connection, source);
        using var client = await app.CreateAuthorizedClientAsync();
        var status = (await client.GetFromJsonAsync<ConnectionStatusDto>(
            "/api/v1/connections/" + BuiltinConnections.Aircraft + "/status"))!;
        Assert.Equal("unavailable", status.HealthState);
        Assert.False(status.ProviderAvailable);
        Assert.Equal(0, status.ActiveConsumers);
        var preview = (await (await client.PostAsJsonAsync("/api/v1/connections/preview",
            new ConnectionPreviewRequest("adsb-lol", 1, Settings(30)))).Content.ReadFromJsonAsync<ConnectionTestDto>())!;
        Assert.False(preview.Valid);
        Assert.Equal("unavailable", preview.State);
        Assert.Equal(0, source.Requests);
    }

    [PostgresFact]
    public async Task DeletingWorkspaceCancelsScopedDemandAndRevokesItsAvailability()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var source = new BlockingAircraftSource();
        await using var app = new ConnectionApp(database.Connection, source);
        using var client = await app.CreateAuthorizedClientAsync();
        var workspaceResponse = await client.PostAsJsonAsync("/api/v1/workspaces", new CreateWorkspaceRequest("Scoped demand"));
        var workspace = (await workspaceResponse.Content.ReadFromJsonAsync<WorkspaceDto>())!;
        var createResponse = await client.PostAsJsonAsync("/api/v1/connections",
            new CreateConnectionRequest("Scoped aircraft", "adsb-lol", null, 1, Settings(30), "workspace", workspace.Id));
        var connection = (await createResponse.Content.ReadFromJsonAsync<ConnectionDto>())!;
        var row = new ConnectionRow { Id = connection.Id, OwnerId = TestIdentity.Owner.Id, Revision = connection.Revision,
            ConnectorTypeId = connection.ConnectorTypeId, SettingsJson = connection.Settings.GetRawText(),
            Scope = connection.Scope, WorkspaceId = connection.WorkspaceId };
        var coordinator = app.Services.GetRequiredService<AircraftCoordinator>();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(12));
        await using var stream = coordinator.Subscribe(new(), timeout.Token, row).GetAsyncEnumerator();
        Assert.True(await stream.MoveNextAsync());
        await source.Started.Task.WaitAsync(timeout.Token);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/v1/workspaces/" + workspace.Id +
            "?revision=" + workspace.Revision)).StatusCode);
        while (await stream.MoveNextAsync()) { }
        await source.Cancelled.Task.WaitAsync(timeout.Token);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/aircraft?connectionId=" +
            connection.Id + "&workspaceId=" + workspace.Id)).StatusCode);
    }

    [PostgresFact]
    public async Task AvailabilityAndImportDoNotCollectAndPreviewDoesNotPersist()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext()) await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
        var source = new CountingAircraftSource();
        await using var app = new ConnectionApp(database.Connection, source);
        using var client = await app.CreateAuthorizedClientAsync();
        var create = await client.PostAsJsonAsync("/api/v1/connections",
            new CreateConnectionRequest("Available second", "adsb-lol", null, 1, Settings(30)));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var row = (await create.Content.ReadFromJsonAsync<ConnectionDto>())!;
        var imported = await client.PostAsJsonAsync("/api/v1/connections/import",
            new ConnectionImportRequest(1, [new(1, "adsb-lol", "Imported third", "global", null, true, Settings(30), false)]));
        Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
        Assert.Equal(0, source.Requests);
        var invalid = await client.PostAsJsonAsync("/api/v1/connections/" + row.Id + "/test",
            new ConnectionTestRequest(row.Revision, 1, Settings(5)));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal(0, source.Requests);
        var previewResponse = await client.PostAsJsonAsync("/api/v1/connections/" + row.Id + "/test",
            new ConnectionTestRequest(row.Revision, 1, Settings(30)));
        Assert.Equal(HttpStatusCode.OK, previewResponse.StatusCode);
        var preview = (await previewResponse.Content.ReadFromJsonAsync<ConnectionTestDto>())!;
        Assert.True(preview.Valid); Assert.Equal(1, source.Requests);
        var repeated = (await (await client.PostAsJsonAsync("/api/v1/connections/" + row.Id + "/test",
            new ConnectionTestRequest(row.Revision, 1, Settings(30)))).Content.ReadFromJsonAsync<ConnectionTestDto>())!;
        Assert.Equal("rate_limited", repeated.State); Assert.Equal(1, source.Requests);
        await using var check = database.CreateContext();
        Assert.Empty(await check.Observations.ToArrayAsync());
        Assert.Equal(row.Revision, (await check.Connections.SingleAsync(x => x.Id == row.Id)).Revision);
    }

    private sealed class BlockingAircraftSource : IAircraftSource
    {
        public AircraftSourceDto Metadata { get; } = new("adsb-lol", "Fixture aircraft", "https://example.test/docs",
            "https://example.test/terms", "Fixture", ["bounded_query"], 30, 250, 500, 24, 10, "Fixture coverage");
        public bool Enabled => true;
        public TimeSpan MinimumRequestInterval => TimeSpan.FromSeconds(8);
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Cancelled { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int Requests;
        public async Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken cancellation)
        {
            Interlocked.Increment(ref Requests); Started.TrySetResult();
            try { await Task.Delay(Timeout.Infinite, cancellation); }
            finally { if (cancellation.IsCancellationRequested) Cancelled.TrySetResult(); }
            return new([], 0, 0, false);
        }
    }

    private sealed class CountingAircraftSource(bool enabled = true) : IAircraftSource
    {
        public AircraftSourceDto Metadata { get; } = new("adsb-lol", "Fixture aircraft", "https://example.test/docs",
            "https://example.test/terms", "Fixture", ["bounded_query"], 30, 250, 500, 24, 10, "Fixture coverage");
        public bool Enabled => enabled;
        public TimeSpan MinimumRequestInterval => TimeSpan.FromSeconds(8);
        public int Requests;
        public Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken cancellation)
        {
            Interlocked.Increment(ref Requests);
            return Task.FromResult(new AircraftFetch([], 0, 0, false));
        }
    }

    private sealed class ConnectionApp(string connection, IAircraftSource? source = null) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VantageDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(options => options.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
            services.AddTestIdentity();
            if (source is not null) { services.RemoveAll<IAircraftSource>(); services.AddSingleton(source); }
        });
    }
}
