using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NJsonSchema;
using Npgsql;
using Vantage.Api.Connectors.Usgs;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Xunit;
namespace Vantage.Api.Tests;

public sealed class EarthquakeTests
{
    // Original synthetic provider-shaped data. No public feed is used in automated checks.
    private static string Payload(DateTimeOffset now, double? magnitude = 4.2, double? depth = 12.3, int revision = 0,
        int occurrence = -3600, bool unknown = false) => JsonSerializer.Serialize(new {
        type = "FeatureCollection", metadata = new { status = 200, count = 1, generated = now.ToUnixTimeMilliseconds() },
        features = new[] { new { type = "Feature", id = "fixture1", geometry = new { type = "Point", coordinates = new double?[] { 12, 58, depth } },
            properties = new { mag = magnitude, magType = unknown ? null : "mw", place = unknown ? null : "Synthetic epicentre",
                time = unknown ? (long?)null : now.AddSeconds(occurrence).ToUnixTimeMilliseconds(),
                updated = unknown ? (long?)null : now.AddSeconds(revision).ToUnixTimeMilliseconds(),
                status = "reviewed", type = "earthquake", net = "test", url = "http://127.0.0.1/private" } } }
    });
    [Fact]
    public async Task NormalizesDepthTimesUnknownsAndBoundsWithoutFollowingSourceLinks()
    {
        var now = DateTimeOffset.UtcNow;
        var fetch = UsgsEarthquakeSource.Parse(Payload(now), now);
        var r = Assert.Single(fetch.Records).Record; var o = r.Observation;
        Assert.Equal(2, o.Geometry!.Coordinates.Length); Assert.Equal(12.3, o.Properties.DepthKilometres);
        Assert.Equal(now.ToUnixTimeMilliseconds(), o.Properties.SourceUpdatedAt!.Value.ToUnixTimeMilliseconds());
        Assert.True(o.ObservedAt < o.Properties.SourceUpdatedAt); Assert.Equal(now, o.RetrievedAt);
        Assert.StartsWith("https://earthquake.usgs.gov/earthquakes/eventpage/", o.Provenance.SourceUrl);
        var duplicate = UsgsEarthquakeSource.Parse(Payload(now), now.AddMinutes(1));
        Assert.Equal(o.Id, duplicate.Records[0].Record.Observation.Id);
        var unknown = UsgsEarthquakeSource.Parse(Payload(now, null, null, unknown: true), now).Records[0].Record.Observation;
        Assert.Null(unknown.ObservedAt); Assert.Null(unknown.Properties.SourceUpdatedAt); Assert.Null(unknown.Properties.Magnitude);
        Assert.Null(unknown.Properties.DepthKilometres); Assert.Null(unknown.Properties.MagnitudeType);
        Assert.Equal(-1, UsgsEarthquakeSource.Parse(Payload(now, depth: -1), now).Records[0].Record.Observation.Properties.DepthKilometres);
        Assert.Throws<SourceException>(() => UsgsEarthquakeSource.Parse("{}", now));
        var schema = await JsonSchema.FromFileAsync(Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json"));
        Assert.Empty(schema.Definitions["EarthquakeRecord"].Validate(JsonSerializer.Serialize(r, ContractJson.Options)));
    }
    [Fact]
    public async Task RateLimitPermissionAndCancellationStayExplicit()
    {
        using var http = new HttpClient(new Handler(HttpStatusCode.TooManyRequests));
        var source = new UsgsEarthquakeSource(http, new ConfigurationBuilder().Build());
        var error = await Assert.ThrowsAsync<SourceException>(() => source.FetchAsync(CancellationToken.None));
        Assert.Equal("rate_limited", error.State); Assert.Equal(TimeSpan.FromMinutes(5), error.RetryAfter);
        Assert.True(SourceTransport.Backoff(60, 1, error.RetryAfter) >= TimeSpan.FromMinutes(5));
        using var denied = new HttpClient(new Handler(HttpStatusCode.Forbidden));
        Assert.Equal("setup_required", (await Assert.ThrowsAsync<SourceException>(() => new UsgsEarthquakeSource(denied,
            new ConfigurationBuilder().Build()).FetchAsync(CancellationToken.None))).State);
        using var ct = new CancellationTokenSource(); ct.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => source.FetchAsync(ct.Token));
    }
    [PostgresFact]
    public async Task MigrationRevisionOrderingRetentionAndSourceSubstitutionAreIsolated()
    {
        var adminString = Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")!;
        var database = "vantage_test_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(adminString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {database}", admin)) await create.ExecuteNonQueryAsync();
        var connection = new NpgsqlConnectionStringBuilder(adminString) { Database = database }.ToString();
        var now = DateTimeOffset.UtcNow; var source = new FixtureSource(UsgsEarthquakeSource.Parse(Payload(now), now));
        try
        {
            await using var app = new TestApp(connection, source);
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
            await db.GetService<IMigrator>().MigrateAsync("20260921201211_AircraftSourceIsolation");
            // Upgrade from the actual handoff schema with existing aircraft evidence and workspace state.
            var json = "{\"entity\":{\"kind\":\"aircraft\"},\"preserve\":true}";
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO platform.observations (\"Id\",\"EntityId\",\"SourceId\",\"RetrievedAt\",\"RecordJson\",\"RawJson\") VALUES ('old-flight','old-aircraft','old-provider',{now},{json}::jsonb,'{{}}'::jsonb)");
            // The current API/model must never run against the old schema.
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO platform.workspaces (\"Id\",\"Name\",\"Revision\",\"SchemaVersion\",\"StateJson\",\"CreatedAt\",\"UpdatedAt\") VALUES ('legacy-workspace','Preserve during migration',1,1,'{{}}'::jsonb,{now},{now})");
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            using var client = await app.CreateAuthorizedClientAsync();
            Assert.Equal("aircraft", (await db.Observations.SingleAsync(x => x.Id == "old-flight")).DataType);
            Assert.Single(await db.Workspaces.ToListAsync());
            var store = scope.ServiceProvider.GetRequiredService<EarthquakeStore>();
            await store.SaveAsync(source.Metadata.Id, source.Fetch, CancellationToken.None);
            var original = Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records);
            await store.SaveAsync(source.Metadata.Id, UsgsEarthquakeSource.Parse(Payload(now), now.AddSeconds(5)), CancellationToken.None);
            Assert.Equal(1, await db.Observations.CountAsync(x => x.DataType == "earthquake"));
            // Occurrence moves backward in the correction; source revision still wins.
            var revised = UsgsEarthquakeSource.Parse(Payload(now, 5.1, revision: 10, occurrence: -7200), now.AddSeconds(15));
            await store.SaveAsync(source.Metadata.Id, revised, CancellationToken.None);
            var latest = Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records);
            Assert.Equal(5.1, latest.Observation.Properties.Magnitude); Assert.Equal(original.Observation.Id, latest.Observation.SupersedesObservationId);
            var late = UsgsEarthquakeSource.Parse(Payload(now, 3.1, revision: -10, occurrence: -60), now.AddSeconds(20));
            await store.SaveAsync(source.Metadata.Id, late, CancellationToken.None);
            Assert.Equal(latest.Observation.Id, Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records).Observation.Id);
            Assert.Equal(3, await db.Observations.CountAsync(x => x.DataType == "earthquake"));
            // Equal revision with different content is evidence, never a silent preferred-value replacement.
            await store.SaveAsync(source.Metadata.Id, UsgsEarthquakeSource.Parse(Payload(now, 6, revision: 10), now.AddSeconds(25)), CancellationToken.None);
            Assert.Equal(latest.Observation.Id, Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records).Observation.Id);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/aircraft/observations/{original.Observation.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/earthquakes/observations/old-flight")).StatusCode);
            Assert.Equal(original.Observation.Id, (await client.GetFromJsonAsync<EarthquakeRecordDto>($"/api/v1/earthquakes/observations/{original.Observation.Id}"))!.Observation.Id);
            // Partial responses retain prior members; an empty complete snapshot removes membership, never evidence.
            await store.SaveAsync(source.Metadata.Id, source.Fetch with { Records = [], Rejected = 1 }, CancellationToken.None);
            Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records);
            await store.SaveAsync(source.Metadata.Id, source.Fetch with { Records = [], Total = 0 }, CancellationToken.None);
            Assert.Empty((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records);
            Assert.True(await db.Observations.AnyAsync(x => x.Id == original.Observation.Id));
            await store.SaveAsync(source.Metadata.Id, revised, CancellationToken.None);
            // Both age and count pruning stay within data type AND source.
            await db.Observations.Where(x => x.Id == original.Observation.Id || x.Id == "old-flight").ExecuteUpdateAsync(s => s.SetProperty(x => x.RetrievedAt, now.AddHours(-30)));
            await scope.ServiceProvider.GetRequiredService<AircraftStore>().PruneAsync("old-provider", CancellationToken.None);
            Assert.False(await db.Observations.AnyAsync(x => x.Id == "old-flight"));
            Assert.True(await db.Observations.AnyAsync(x => x.Id == original.Observation.Id));
            db.Observations.Add(new() { Id = "other-provider-evidence", SourceId = "other", DataType = "earthquake", RetrievedAt = now.AddHours(-60) });
            await db.SaveChangesAsync();
            await ObservationRetention.PruneAsync(db, "earthquake", source.Metadata.Id, now.AddHours(-48), 2, CancellationToken.None);
            Assert.Equal(2, await db.Observations.CountAsync(x => x.SourceId == source.Metadata.Id));
            Assert.True(await db.Observations.AnyAsync(x => x.Id == "other-provider-evidence"));
            // An older whole-feed response cannot delete current members or lower freshness.
            await Assert.ThrowsAsync<SourceException>(() => store.SaveAsync(source.Metadata.Id, source.Fetch with { GeneratedAt = now.AddMinutes(-10) }, CancellationToken.None));
            Assert.Equal(latest.Observation.Id, Assert.Single((await store.QueryAsync(source.Metadata, CancellationToken.None)).Records).Observation.Id);
            // A second registered provider uses the same collector, API and store without leaking original records.
            var alternate = new FixtureSource(source.Fetch, "alternate-quakes");
            await using var replacement = new TestApp(connection, alternate);
            var coordinator = replacement.Services.GetRequiredService<EarthquakeCoordinator>();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            var one = coordinator.Subscribe(timeout.Token).GetAsyncEnumerator(); var two = coordinator.Subscribe(timeout.Token).GetAsyncEnumerator();
            try
            {
                Assert.True(await one.MoveNextAsync()); Assert.True(one.Current.Reset); Assert.True(await two.MoveNextAsync());
                Assert.Equal(one.Current.SubscriptionId, two.Current.SubscriptionId);
                do { Assert.True(await one.MoveNextAsync()); } while (one.Current.Health.State == "loading");
                Assert.Equal("healthy", one.Current.Health.State); Assert.Equal(1, alternate.Requests);
                Assert.Equal("alternate-quakes", Assert.Single(one.Current.Upserts).Observation.SourceId);
                var schema = await JsonSchema.FromFileAsync(Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json"));
                Assert.Empty(schema.Definitions["EarthquakeBatch"].Validate(JsonSerializer.Serialize(one.Current, ContractJson.Options)));
                using var replacementClient = await replacement.CreateAuthorizedClientAsync();
                var snapshot = await replacementClient.GetFromJsonAsync<EarthquakeSnapshotDto>("/api/v1/earthquakes");
                Assert.Equal("alternate-quakes", Assert.Single(snapshot!.Records).Observation.SourceId);
            }
            finally { await one.DisposeAsync(); await two.DisposeAsync(); }
            Assert.Equal(1, alternate.Requests);
            // Losing the final subscriber cancels an in-flight fetch, rather than completing unnecessary work.
            var blocking = new FixtureSource(source.Fetch, block: true);
            await using var cancellationApp = new TestApp(connection, blocking);
            var pending = cancellationApp.Services.GetRequiredService<EarthquakeCoordinator>().Subscribe(timeout.Token).GetAsyncEnumerator();
            Assert.True(await pending.MoveNextAsync());
            await blocking.Started.Task.WaitAsync(timeout.Token);
            await pending.DisposeAsync();
            await blocking.Cancelled.Task.WaitAsync(timeout.Token);
            Assert.Equal(1, blocking.Requests);
        }
        finally { NpgsqlConnection.ClearAllPools(); await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    private sealed class FixtureSource : IEarthquakeSource
    {
        public EarthquakeFetch Fetch { get; }
        private readonly bool block;
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Cancelled { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int Requests { get; private set; }
        public EarthquakeSourceDto Metadata { get; }
        public bool Enabled => true;
        public FixtureSource(EarthquakeFetch fetch, string id = UsgsEarthquakeSource.SourceId, bool block = false)
        {
            this.block = block;
            Metadata = new(id, "Synthetic earthquakes", "https://example.com/", "https://example.com/terms", "Test fixture", ["current_catalog"], 60, 1000, 48, "Synthetic coverage", "Synthetic past day", 180);
            Fetch = id == UsgsEarthquakeSource.SourceId ? fetch : fetch with { Records = fetch.Records.Select(d => {
                var entityId = id + ":fixture1"; var o = d.Record.Observation;
                return d with { Record = d.Record with { Entity = d.Record.Entity with { Id = entityId }, Observation = o with {
                    Id = "obs:" + id, EntityId = entityId, SourceId = id, Provenance = o.Provenance with { SourceId = id, RawRef = "obs:" + id } } } };
            }).ToArray() };
        }
        public async Task<EarthquakeFetch> FetchAsync(CancellationToken cancellation) {
            cancellation.ThrowIfCancellationRequested(); Requests++; Started.TrySetResult();
            if (block) {
                try { await Task.Delay(Timeout.Infinite, cancellation); }
                finally { if (cancellation.IsCancellationRequested) Cancelled.TrySetResult(); }
            }
            return Fetch;
        }
    }
    private sealed class Handler(HttpStatusCode status) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested(); Assert.Equal(UsgsEarthquakeSource.Endpoint, request.RequestUri!.AbsoluteUri);
            var response = new HttpResponseMessage(status) { Content = new StringContent("{}") };
            response.Headers.RetryAfter = new(TimeSpan.FromMinutes(5)); return Task.FromResult(response);
        }
    }
    private sealed class TestApp(string connection, IEarthquakeSource source) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services => {
            services.RemoveAll<DbContextOptions<VantageDbContext>>(); services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
            services.AddTestIdentity();
            services.RemoveAll<IEarthquakeSource>(); services.AddSingleton(source);
        });
    }
}
