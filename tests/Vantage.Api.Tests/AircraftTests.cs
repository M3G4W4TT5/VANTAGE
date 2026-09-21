using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NJsonSchema;
using Npgsql;
using Vantage.Api.Connectors.AdsbLol;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Observations;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class AircraftTests
{
    // Original synthetic provider-shaped data. No live service is called by this test.
    private static string Payload(DateTimeOffset now, double longitude = 12, double latitude = 58, double speed = 100) => JsonSerializer.Serialize(new
    {
        now = now.ToUnixTimeMilliseconds(), msg = "No error", total = 2,
        ac = new object[] { new { hex = "abcdef", flight = "TEST01", type = "mlat", lon = longitude, lat = latitude,
            gs = speed, alt_baro = 10000, alt_geom = 11000, track = 90, seen = 1, seen_pos = 2, mlat = new[] { "lat", "lon" } }, new { hex = "bad-address" } }
    });
    [PostgresFact]
    public async Task SharedCollectionPersistsImmutableEvidenceRecoversCacheAndCancelsWithoutDemand()
    {
        var adminString = Environment.GetEnvironmentVariable("VANTAGE_TEST_CONNECTION")!;
        var database = "vantage_test_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(adminString); await admin.OpenAsync();
        await using (var command = new NpgsqlCommand($"CREATE DATABASE {database}", admin)) await command.ExecuteNonQueryAsync();
        var connection = new NpgsqlConnectionStringBuilder(adminString) { Database = database }.ToString();
        var now = DateTimeOffset.UtcNow; var handler = new FeedHandler(Payload(now));
        try
        {
            await using var app = new TestApp(connection, handler);
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
            Assert.Equal(database, db.Database.GetDbConnection().Database); await db.Database.MigrateAsync();
            var coordinator = app.Services.GetRequiredService<AircraftCoordinator>();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            var first = coordinator.Subscribe(new(), timeout.Token).GetAsyncEnumerator();
            var second = coordinator.Subscribe(new(), timeout.Token).GetAsyncEnumerator();
            try
            {
                Assert.True(await first.MoveNextAsync()); Assert.True(first.Current.Reset);
                Assert.True(await second.MoveNextAsync()); Assert.Equal(first.Current.SubscriptionId, second.Current.SubscriptionId);
                AircraftBatchDto batch;
                do { Assert.True(await first.MoveNextAsync()); batch = first.Current; } while (batch.Health.State is "loading");
                Assert.Equal("degraded", batch.Health.State); Assert.Equal(1, batch.Health.RejectedCount); Assert.Equal(1, handler.Requests);
                var record = Assert.Single(batch.Upserts); var observation = record.Observation;
                Assert.Equal("inferred", observation.EvidenceClass); Assert.Equal(3048, observation.Properties.BarometricAltitudeMetres);
                Assert.Equal(100 * 1852d / 3600, observation.Properties.SpeedMetresPerSecond!.Value, 9); Assert.Null(observation.Properties.TrueHeadingDegrees);
                var schema = await JsonSchema.FromFileAsync(Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json"));
                Assert.Empty(schema.Definitions["AircraftBatch"].Validate(JsonSerializer.Serialize(batch, ContractJson.Options)));
                using var client = app.CreateClient();
                var saved = await client.GetFromJsonAsync<AircraftRecordDto>($"/api/v1/aircraft/observations/{observation.Id}");
                Assert.Equal(observation.Id, saved!.Observation.Id);
                var store = scope.ServiceProvider.GetRequiredService<AircraftStore>();
                var same = AdsbLolClient.Parse(Payload(now), now.AddSeconds(5), observation.Provenance.SourceUrl);
                await store.SaveAsync(same, timeout.Token); Assert.Equal(1, await db.Observations.CountAsync());
                var old = AdsbLolClient.Parse(Payload(now.AddMinutes(-2), speed: 50), now.AddSeconds(6), observation.Provenance.SourceUrl);
                await store.SaveAsync(old, timeout.Token); Assert.Equal(2, await db.Observations.CountAsync());
                Assert.Equal(observation.Id, Assert.Single(await store.QueryAsync("adsb-lol", new(), 500, timeout.Token)).Observation.Id);
                var dateline = AdsbLolClient.Parse(Payload(now.AddSeconds(3), -179.9, 0), now.AddSeconds(10), observation.Provenance.SourceUrl);
                await store.SaveAsync(dateline, timeout.Token);
                Assert.Single(await store.QueryAsync("adsb-lol", new(179.9, 0, 50), 500, timeout.Token));
                Assert.Empty(await store.QueryAsync("adsb-lol", new(), 500, timeout.Token));
                Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/aircraft?radiusNm=251")).StatusCode);
                // New context proves the observation and spatial projection are read from PostgreSQL, not an in-memory double.
                using var restoredScope = app.Services.CreateScope();
                Assert.Single(await restoredScope.ServiceProvider.GetRequiredService<AircraftStore>().QueryAsync("adsb-lol", new(179.9, 0, 50), 500, timeout.Token));
            }
            finally { await first.DisposeAsync(); await second.DisposeAsync(); }
            // Swap the registered capability implementation. The same coordinator and store must use only its records.
            var original = AdsbLolClient.Parse(Payload(DateTimeOffset.UtcNow), DateTimeOffset.UtcNow, "https://api.adsb.lol/").Records[0];
            var alternate = new AlternateSource(original.Record);
            await using var replacement = new TestApp(connection, handler, alternate);
            var stream = replacement.Services.GetRequiredService<AircraftCoordinator>().Subscribe(new(), timeout.Token).GetAsyncEnumerator();
            try
            {
                Assert.True(await stream.MoveNextAsync());
                Assert.Equal("fixture-provider", stream.Current.Source.Id);
                do { Assert.True(await stream.MoveNextAsync()); } while (stream.Current.Health.State == "loading");
                var record = Assert.Single(stream.Current.Upserts);
                Assert.Equal("fixture-provider", record.Observation.SourceId);
                Assert.Equal("fixture-provider:flight-1", record.Entity.Id);
                using var client = replacement.CreateClient();
                var results = await client.GetFromJsonAsync<AircraftRecordDto[]>("/api/v1/aircraft");
                Assert.Equal("fixture-provider", Assert.Single(results!).Observation.SourceId);
                // Original provider evidence remains available by its immutable observation ID.
                Assert.NotNull(await client.GetFromJsonAsync<AircraftRecordDto>($"/api/v1/aircraft/observations/{(await db.Observations.AsNoTracking().FirstAsync(x => x.SourceId == "adsb-lol")).Id}"));
            }
            finally { await stream.DisposeAsync(); }
            // Cancelling all subscribers prevents any subsequent fetch for this demand.
            Assert.Equal(1, handler.Requests);
        }
        finally { NpgsqlConnection.ClearAllPools(); await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    [Fact]
    public async Task ProviderRateLimitAndInvalidDataRemainExplicit()
    {
        var handler = new FeedHandler("{}") { Status = HttpStatusCode.TooManyRequests };
        var client = new AdsbLolClient(new HttpClient(handler), new ConfigurationBuilder().Build());
        var error = await Assert.ThrowsAsync<SourceException>(() => client.FetchAsync(new(), CancellationToken.None));
        Assert.Equal("rate_limited", error.State); Assert.Equal(TimeSpan.FromMinutes(3), error.RetryAfter);
        Assert.Throws<SourceException>(() => AdsbLolClient.Parse("{}", DateTimeOffset.UtcNow, "https://api.adsb.lol/"));
        using var cancellation = new CancellationTokenSource(); cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.FetchAsync(new(), cancellation.Token));
    }
    private sealed class AlternateSource(AircraftRecordDto original) : IAircraftSource
    {
        public AircraftSourceDto Metadata => new("fixture-provider", "Synthetic alternate provider", "https://example.com/", "https://example.com/terms",
            "Test fixture", ["bounded_query"], 30, 300, 20, 24, 10, "Synthetic coverage.");
        public bool Enabled => true;
        public TimeSpan MinimumRequestInterval => TimeSpan.FromSeconds(1);
        public Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken cancellation)
        {
            var o = original.Observation;
            var record = original with { Entity = original.Entity with { Id = "fixture-provider:flight-1" },
                IdentityRule = "fixture-provider-flight/v1", IdentityDescription = "Synthetic flight ID.",
                Observation = o with { Id = "obs:alternate", EntityId = "fixture-provider:flight-1", SourceId = Metadata.Id,
                    Provenance = o.Provenance with { SourceId = Metadata.Id, RawRef = "obs:alternate", Attribution = Metadata.Attribution } } };
            return Task.FromResult(new AircraftFetch([new(record, "{}")], 1, 0, false));
        }
    }
    private sealed class FeedHandler(string payload) : HttpMessageHandler
    {
        public int Requests { get; private set; }
        public HttpStatusCode Status { get; init; } = HttpStatusCode.OK;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested(); Requests++;
            Assert.Equal("api.adsb.lol", request.RequestUri!.Host);
            var response = new HttpResponseMessage(Status) { Content = new StringContent(payload) };
            response.Headers.RetryAfter = new(TimeSpan.FromMinutes(3)); return Task.FromResult(response);
        }
    }
    private sealed class TestApp(string connection, FeedHandler handler, IAircraftSource? alternate = null) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VantageDbContext>>(); services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(o => o.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
            services.AddHttpClient<AdsbLolClient>().ConfigurePrimaryHttpMessageHandler(() => handler);
            if (alternate is not null)
            {
                services.RemoveAll<IAircraftSource>(); services.AddSingleton(alternate);
            }
        });
    }
}
