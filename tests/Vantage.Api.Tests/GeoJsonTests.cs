using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NetTopologySuite.Geometries;
using NJsonSchema;
using Vantage.Api.Connectors.GeoJson;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Xunit;

namespace Vantage.Api.Tests;

public sealed class GeoJsonTests
{
    private static HttpGeoJsonSettings Settings(string source = "fixture.geojson", string host = "feed.example.org", string auth = "none") =>
        new($"https://{host}/current.geojson", source, "Fixture GeoJSON", "Fixture publisher",
            "https://feed.example.org/terms", "Synthetic fixture region", "", "name", "updated",
            "start", "end", auth, 120);

    private const string Features = """
      {"type":"FeatureCollection","features":[
        {"type":"Feature","id":"p","properties":{"name":"Point item","updated":"2026-09-23T10:00:00Z","start":null,"end":null},"geometry":{"type":"Point","coordinates":[12,58,42]}},
        {"type":"Feature","id":"mp","properties":{"name":"Two points","updated":null},"geometry":{"type":"MultiPoint","coordinates":[[12,58],[13,59]]}},
        {"type":"Feature","id":"l","properties":{"name":"Line"},"geometry":{"type":"LineString","coordinates":[[12,58],[13,59]]}},
        {"type":"Feature","id":"ml","properties":{"name":"Lines"},"geometry":{"type":"MultiLineString","coordinates":[[[12,58],[13,59]],[[13,59],[14,59]]]}},
        {"type":"Feature","id":"a","properties":{"name":"Area"},"geometry":{"type":"Polygon","coordinates":[[[12,58],[13,58],[13,59],[12,58]]]}},
        {"type":"Feature","id":"ma","properties":{"name":"Areas"},"geometry":{"type":"MultiPolygon","coordinates":[[[[12,58],[13,58],[13,59],[12,58]]],[[[14,58],[15,58],[15,59],[14,58]]]]}},
        {"type":"Feature","id":"none","properties":{"name":"List only"},"geometry":null}
      ]}
      """;
    private static byte[] Bytes(string value) => Encoding.UTF8.GetBytes(value);

    [Fact]
    public async Task ParsesEveryDeclaredGeometryAndUnknownTimeWithoutInventingDomainSemantics()
    {
        var now = DateTimeOffset.Parse("2026-09-23T11:00:00Z");
        var parsed = HttpGeoJsonSource.Parse(Bytes(Features), Settings(), now);
        Assert.Equal(7, parsed.Records.Length);
        Assert.Equal(new[] { "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", null },
            parsed.Records.Select(x => x.Record.Observation.Geometry?.Type));
        Assert.Equal(42, parsed.Records[0].Record.Observation.Geometry!.Coordinates[2].GetDouble());
        Assert.Equal("geojson-feature", parsed.Records[0].Record.Entity.Kind);
        Assert.Equal(now, parsed.Records[0].Record.Observation.RetrievedAt);
        Assert.NotNull(parsed.Records[0].Record.Observation.ObservedAt);
        Assert.Null(parsed.Records[1].Record.Observation.ObservedAt);
        Assert.Null(parsed.Records[^1].Geometry);
        Assert.Null(parsed.Records[^1].Record.Observation.Geometry);
        Assert.Equal(parsed.Records[0].Record.Observation.Id,
            HttpGeoJsonSource.Parse(Bytes(Features), Settings(), now.AddMinutes(2)).Records[0].Record.Observation.Id);
        var schema = await JsonSchema.FromFileAsync(Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json"));
        foreach (var record in parsed.Records)
            Assert.Empty(schema.Definitions["GeoJsonRecord"].Validate(JsonSerializer.Serialize(record.Record, ContractJson.Options)));
    }

    [Fact]
    public void RejectsMalformedUnsupportedDuplicateMissingAndOutOfBoundsInput()
    {
        var settings = Settings(); var now = DateTimeOffset.UtcNow;
        void Reject(string payload) => Assert.Throws<SourceException>(() => HttpGeoJsonSource.Parse(Bytes(payload), settings, now));
        Reject("not json"); Reject("{}"); Reject("{\"type\":\"FeatureCollection\",\"features\":{}}");
        Reject(Features.Replace("\"id\":\"mp\"", "\"id\":\"p\""));
        Reject(Features.Replace("\"id\":\"p\",", ""));
        Reject(Features.Replace("\"id\":\"p\"", "\"id\":\"   \""));
        Reject(Features.Replace("\"type\":\"LineString\"", "\"type\":\"GeometryCollection\""));
        Reject(Features.Replace("[12,58,42]", "[181,58]"));
        Reject(Features.Replace("2026-09-23T10:00:00Z", "yesterday"));
        Reject(Features.Replace("\"2026-09-23T10:00:00Z\"", "1790160000000"));
        Reject(Features.Replace("2026-09-23T10:00:00Z", "1899-09-23T10:00:00Z"));
        Reject(Features.Replace("\"name\":\"Point item\"", "\"name\":\"" + new string('x', 16385) + "\""));
        Reject(Features.Replace("[[12,58],[13,59]]", "[" + string.Join(",", Enumerable.Repeat("[12,58]", 5001)) + "]"));
        Reject(Features.Replace("[12,58],[13,58],[13,59],[12,58]", "[12,58],[13,58],[13,59],[12,59]"));
        Assert.Throws<SourceException>(() => HttpGeoJsonSource.Parse(new byte[HttpGeoJsonSettings.PayloadLimit + 1], settings, now));
        var tooMany = JsonSerializer.Serialize(new { type = "FeatureCollection", features = Enumerable.Range(0, 501)
            .Select(i => new { type = "Feature", id = i.ToString(), properties = new { name = "x" }, geometry = (object?)null }) });
        Reject(tooMany);
        var tooManyCoordinates = JsonSerializer.Serialize(new { type = "FeatureCollection", features = Enumerable.Range(0, 500)
            .Select(i => new { type = "Feature", id = i.ToString(), properties = new { name = "x" },
                geometry = new { type = "MultiPoint", coordinates = Enumerable.Repeat(new[] { 12, 58 }, 101) } }) });
        Reject(tooManyCoordinates);
    }

    [Fact]
    public async Task PublicDestinationRedirectAuthenticationAndPayloadBoundsAreEnforced()
    {
        Assert.True(PublicHttpsDestination.IsValid(Settings().Endpoint));
        foreach (var endpoint in new[] { "http://feed.example.org/x", "https://127.0.0.1/x", "https://localhost/x",
            "https://user:pass@feed.example.org/x", "https://feed.example.org:8443/x", "https://feed.example.org/x?token=secret",
            "https://feed.example.org/x#fragment", "https://service.internal/x" })
            Assert.False(PublicHttpsDestination.IsValid(endpoint));
        foreach (var address in new[] { "127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1", "100.64.0.1", "::1", "fc00::1" })
            Assert.False(PublicHttpsDestination.IsPublic(IPAddress.Parse(address)));
        Assert.True(PublicHttpsDestination.IsPublic(IPAddress.Parse("9.9.9.9")));
        using var handler = new Handler(_ => new(HttpStatusCode.Redirect));
        using var http = new HttpClient(handler);
        var source = new HttpGeoJsonSource(http);
        Assert.Equal("error", (await Assert.ThrowsAsync<SourceException>(() => source.FetchAsync(Settings(), null, default))).State);
        Assert.Equal(1, handler.Requests);
        Assert.Equal("setup_required", (await Assert.ThrowsAsync<SourceException>(() => source.FetchAsync(Settings(auth: "bearer"), null, default))).State);
        Assert.Equal(1, handler.Requests);
        using var big = new HttpClient(new Handler(_ => JsonResponse(new string(' ', HttpGeoJsonSettings.PayloadLimit + 1))));
        Assert.Throws<SourceException>(() => HttpGeoJsonSource.Parse(Bytes(new string(' ', HttpGeoJsonSettings.PayloadLimit + 1)), Settings(), DateTimeOffset.UtcNow));
        Assert.Equal("error", (await Assert.ThrowsAsync<SourceException>(() => new HttpGeoJsonSource(big).FetchAsync(Settings(), null, default))).State);
        using var authorized = new HttpClient(new Handler(request => {
            Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
            Assert.Equal("fixture-only-token", request.Headers.Authorization?.Parameter);
            return JsonResponse(Features);
        }));
        Assert.Equal(7, (await new HttpGeoJsonSource(authorized).FetchAsync(Settings(auth: "bearer"), "fixture-only-token", default)).Records.Length);
    }

    [PostgresFact]
    public async Task TwoConnectionsPreserveRevisionsGeometryAndLastValidSnapshotAcrossStoreRestart()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        var now = DateTimeOffset.UtcNow;
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            foreach (var id in new[] { "geo-one", "geo-two" })
            {
                db.Connections.Add(new ConnectionRow { Id = id, OwnerId = TestIdentity.Owner.Id, Name = id,
                    ConnectorTypeId = "http-geojson", SettingsJson = JsonSerializer.Serialize(Settings(source: id)),
                    CreatedAt = now, UpdatedAt = now });
                db.Datasets.Add(new DatasetRow { Id = id + ":features", ConnectionId = id, ProductId = "features",
                    SourceId = id, Domain = "geojson", MetadataJson = "{}" });
            }
            await db.SaveChangesAsync();
            var validation = await ObservationValidation.LoadAsync();
            var store = new GeoJsonStore(db, validation);
            var connections = await db.Connections.Where(x => x.ConnectorTypeId == "http-geojson").OrderBy(x => x.Id).ToArrayAsync();
            foreach (var connection in connections)
                await store.SaveAsync(connection, HttpGeoJsonSource.Parse(Bytes(Features), Settings(source: connection.Id), now), default);
            Assert.Equal(14, await db.CurrentGeoJson.CountAsync());
            var shapes = await db.CurrentGeoJson.AsNoTracking().Select(x => x.Shape).ToArrayAsync();
            Assert.Equal(2, shapes.Count(x => x is Point));
            Assert.Equal(2, await db.CurrentGeoJson.CountAsync(x => x.Shape == null));
            Assert.Equal(14, await db.Observations.CountAsync(x => x.DataType == "geojson"));
            var first = connections[0];
            var original = (await store.QueryAsync(first, default)).Records.Single(x => x.Entity.Label == "Point item");
            await store.SaveAsync(first, HttpGeoJsonSource.Parse(Bytes(Features), Settings(source: first.Id), now.AddMinutes(1)), default);
            Assert.Equal(14, await db.Observations.CountAsync(x => x.DataType == "geojson"));
            var updated = Features.Replace("Point item", "Changed point");
            await store.SaveAsync(first, HttpGeoJsonSource.Parse(Bytes(updated), Settings(source: first.Id), now.AddMinutes(2)), default);
            var latest = (await store.QueryAsync(first, default)).Records.Single(x => x.Entity.Label == "Changed point");
            Assert.Equal(original.Observation.Id, latest.Observation.SupersedesObservationId);
            Assert.Equal(15, await db.Observations.CountAsync(x => x.DataType == "geojson"));
            Assert.Throws<SourceException>(() => HttpGeoJsonSource.Parse(Bytes("{bad"), Settings(source: first.Id), now.AddMinutes(3)));
            Assert.Equal(latest.Observation.Id, (await store.QueryAsync(first, default)).Records.Single(x => x.Entity.Label == "Changed point").Observation.Id);
            Assert.Equal(7, (await store.QueryAsync(connections[1], default)).Records.Length);
        }
        await using (var reopened = database.CreateContext())
        {
            var store = new GeoJsonStore(reopened, await ObservationValidation.LoadAsync());
            var connection = await reopened.Connections.SingleAsync(x => x.Id == "geo-one");
            Assert.Equal(7, (await store.QueryAsync(connection, default)).Records.Length);
            var shapes = await reopened.CurrentGeoJson.AsNoTracking()
                .Where(x => x.ConnectionId == connection.Id).Select(x => x.Shape).ToArrayAsync();
            Assert.Equal(2, shapes.Count(x => x is Polygon or MultiPolygon));
        }
    }

    [PostgresFact]
    public async Task SharedDemandRetainsCachedFeaturesWhenOneOfTwoConnectionsReturnsBadInput()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        var now = DateTimeOffset.UtcNow;
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            foreach (var (id, host) in new[] { ("geo-one", "one.example.org"), ("geo-two", "two.example.org") })
            {
                var connection = new ConnectionRow { Id = id, OwnerId = TestIdentity.Owner.Id, Name = id,
                    ConnectorTypeId = "http-geojson", SettingsJson = JsonSerializer.Serialize(Settings(source: id, host: host)),
                    CreatedAt = now, UpdatedAt = now };
                db.Connections.Add(connection);
                db.Datasets.Add(new DatasetRow { Id = id + ":features", ConnectionId = id, ProductId = "features",
                    SourceId = id, Domain = "geojson", MetadataJson = "{}" });
                await db.SaveChangesAsync();
                if (id == "geo-one") await new GeoJsonStore(db, await ObservationValidation.LoadAsync()).SaveAsync(connection,
                    HttpGeoJsonSource.Parse(Bytes(Features), Settings(source: id, host: host), now), default);
            }
        }
        var handler = new Handler(request => request.RequestUri!.Host == "one.example.org" ? JsonResponse("{bad") : JsonResponse(Features));
        await using var app = new GeoJsonApp(database.Connection, handler);
        using var client = await app.CreateAuthorizedClientAsync();
        var coordinator = app.Services.GetRequiredService<GeoJsonCoordinator>();
        await using var dbCheck = database.CreateContext();
        var one = await dbCheck.Connections.AsNoTracking().SingleAsync(x => x.Id == "geo-one");
        var two = await dbCheck.Connections.AsNoTracking().SingleAsync(x => x.Id == "geo-two");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await using var first = coordinator.Subscribe(one, timeout.Token).GetAsyncEnumerator();
        await using var second = coordinator.Subscribe(one, timeout.Token).GetAsyncEnumerator();
        await using var independent = coordinator.Subscribe(two, timeout.Token).GetAsyncEnumerator();
        Assert.True(await first.MoveNextAsync()); Assert.True(await second.MoveNextAsync()); Assert.True(await independent.MoveNextAsync());
        Assert.Equal(first.Current.SubscriptionId, second.Current.SubscriptionId);
        Assert.NotEqual(first.Current.SubscriptionId, independent.Current.SubscriptionId);
        var retained = false;
        do { Assert.True(await first.MoveNextAsync()); retained |= first.Current.Upserts.Length == 7; }
        while (first.Current.Health.State == "loading");
        do { Assert.True(await independent.MoveNextAsync()); } while (independent.Current.Health.State == "loading");
        Assert.Equal("error", first.Current.Health.State);
        Assert.True(retained);
        Assert.Equal("healthy", independent.Current.Health.State);
        Assert.Equal(1, handler.RequestsByHost("one.example.org"));
        Assert.Equal(1, handler.RequestsByHost("two.example.org"));
        Assert.Equal(2, coordinator.Snapshot(one.Id).Consumers);
        Assert.Equal(7, (await new GeoJsonStore(dbCheck, await ObservationValidation.LoadAsync()).QueryAsync(one, default)).Records.Length);
        coordinator.Cancel(one.Id);
        Assert.Equal(0, coordinator.Snapshot(one.Id).Consumers);
        Assert.Equal(1, coordinator.Snapshot(two.Id).Consumers);
        Assert.Equal(7, (await new GeoJsonStore(dbCheck, await ObservationValidation.LoadAsync()).QueryAsync(one, default)).Records.Length);
        await independent.DisposeAsync();
        Assert.Equal(0, coordinator.Snapshot(two.Id).Consumers);
    }

    [PostgresFact]
    public async Task SlowGeoJsonConnectionDoesNotHoldUpAnotherConnection()
    {
        await using var database = await IsolatedDatabase.CreateAsync();
        await using (var db = database.CreateContext())
        {
            await OwnershipMigration.MigrateAsync(db, TestIdentity.Owner);
            foreach (var (id, host) in new[] { ("geo-slow", "slow.example.org"), ("geo-fast", "fast.example.org") })
            {
                db.Connections.Add(new ConnectionRow { Id = id, OwnerId = TestIdentity.Owner.Id, Name = id,
                    ConnectorTypeId = "http-geojson", SettingsJson = JsonSerializer.Serialize(Settings(source: id, host: host)),
                    CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
                db.Datasets.Add(new DatasetRow { Id = id + ":features", ConnectionId = id, ProductId = "features",
                    SourceId = id, Domain = "geojson", MetadataJson = "{}" });
            }
            await db.SaveChangesAsync();
        }
        var slowEntered = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseSlow = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        using var handler = new DelayedHandler(slowEntered, releaseSlow);
        await using var app = new GeoJsonApp(database.Connection, handler);
        try
        {
            var coordinator = app.Services.GetRequiredService<GeoJsonCoordinator>();
            await using var check = database.CreateContext();
            var slow = await check.Connections.AsNoTracking().SingleAsync(x => x.Id == "geo-slow");
            var fast = await check.Connections.AsNoTracking().SingleAsync(x => x.Id == "geo-fast");
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await using var slowStream = coordinator.Subscribe(slow, timeout.Token).GetAsyncEnumerator();
            await using var fastStream = coordinator.Subscribe(fast, timeout.Token).GetAsyncEnumerator();
            Assert.True(await slowStream.MoveNextAsync());
            Assert.True(await fastStream.MoveNextAsync());
            await slowEntered.Task.WaitAsync(TimeSpan.FromSeconds(4));
            var fastTimer = Stopwatch.StartNew();
            GeoJsonBatchDto next;
            do
            {
                Assert.True(await fastStream.MoveNextAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(4)));
                next = fastStream.Current;
            } while (next.Health.State == "loading");
            Assert.Equal("healthy", next.Health.State);
            Assert.Equal(7, next.Upserts.Length);
            Assert.Equal(1, coordinator.Snapshot(slow.Id).Consumers);
            Console.WriteLine($"GeoJSON fast connection while peer is blocked: {fastTimer.Elapsed.TotalMilliseconds:F0} ms");
        }
        finally { releaseSlow.TrySetResult(true); }
    }

    private sealed class GeoJsonApp(string connection, HttpMessageHandler handler) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VantageDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<VantageDbContext>>();
            services.AddDbContext<VantageDbContext>(options => options.UseNpgsql(connection, pg => pg.UseNetTopologySuite()));
            services.AddTestIdentity();
            services.RemoveAll<HttpGeoJsonSource>();
            services.AddSingleton(new HttpGeoJsonSource(new HttpClient(handler)));
        });
    }

    private static HttpResponseMessage JsonResponse(string body) => new(HttpStatusCode.OK) {
        Content = new StringContent(body, Encoding.UTF8, "application/geo+json") };
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        public int Requests { get; private set; }
        private readonly Dictionary<string, int> byHost = [];
        public int RequestsByHost(string host) { lock (byHost) return byHost.GetValueOrDefault(host); }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        { Requests++; lock (byHost) byHost[request.RequestUri!.Host] = byHost.GetValueOrDefault(request.RequestUri.Host) + 1;
            return Task.FromResult(reply(request)); }
    }

    private sealed class DelayedHandler(TaskCompletionSource<bool> entered, TaskCompletionSource<bool> release) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri!.Host == "slow.example.org")
            {
                entered.TrySetResult(true);
                await release.Task.WaitAsync(cancellationToken);
            }
            return JsonResponse(Features);
        }
    }
}
