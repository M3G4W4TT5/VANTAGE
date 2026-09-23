using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Vantage.Api.Contracts;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

// One bounded collector shared by equivalent pane/tab demands. No demand means no provider requests.
public sealed class AircraftCoordinator(IServiceScopeFactory scopes, AircraftSources sources, ProviderRequestBudget budget,
    ILogger<AircraftCoordinator> logger) : BackgroundService, IConnectionDemandControl
{
    private sealed record Key(string ConnectionId, long Revision, string OwnerId, AircraftQuery Query);
    private sealed class Demand(Key key, int pollSeconds)
    {
        public Key Key { get; } = key;
        public AircraftQuery Query => Key.Query;
        public int PollSeconds { get; } = pollSeconds;
        public string Id { get; } = Guid.NewGuid().ToString("N");
        public CancellationTokenSource Cancellation { get; } = new();
        public HashSet<Channel<AircraftBatchDto>> Subscribers { get; } = [];
        public AircraftRecordDto[] Records { get; set; } = [];
        public SourceHealthDto Health { get; set; } = new("loading", "Loading the local cache and requesting the aircraft source.", null, null, null);
        public bool Truncated { get; set; }
        public long Sequence { get; set; }
        public int Failures { get; set; }
        public bool Initialized { get; set; }
        public DateTimeOffset Next { get; set; } = DateTimeOffset.MinValue;
    }
    private readonly object gate = new();
    private readonly Dictionary<Key, Demand> demands = [];
    private DateTimeOffset providerNext;
    private IAircraftSource Provider => sources.Active;
    public AircraftSourceDto Source => Provider.Metadata;
    public int PollSeconds => Source.PollSeconds;

    public ConnectionDemandSnapshot Snapshot(string connectionId)
    {
        lock (gate)
        {
            var active = demands.Values.Where(x => x.Key.ConnectionId == connectionId).ToArray();
            if (active.Length == 0) return new(0, 0, null, null);
            var states = active.Select(x => x.Health.State).Distinct().ToArray();
            return new(active.Length, active.Sum(x => x.Subscribers.Count),
                states.Length == 1 ? states[0] : "mixed",
                states.Length == 1 ? active[0].Health.Message : "Active areas have different source states.");
        }
    }

    public async IAsyncEnumerable<AircraftBatchDto> Subscribe(AircraftQuery query, [EnumeratorCancellation] CancellationToken ct,
        ConnectionRow? connection = null)
    {
        if (!query.IsValid) throw new ArgumentException($"Use longitude -180…180, latitude -85…85 and radius {Source.MinimumRadiusNm}…{Source.MaximumRadiusNm} NM.");
        query = query.Normalized();
        connection ??= new ConnectionRow { Id = BuiltinConnections.Aircraft, OwnerId = "internal", Revision = 1,
            ConnectorTypeId = "adsb-lol", SettingsJson = "{\"pollSeconds\":30}" };
        var key = new Key(connection.Id, connection.Revision, connection.OwnerId, query);
        var pollSeconds = JsonPollSeconds(connection.SettingsJson, PollSeconds);
        var channel = Channel.CreateBounded<AircraftBatchDto>(new BoundedChannelOptions(4) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        Demand demand;
        lock (gate)
        {
            if (!demands.TryGetValue(key, out demand!))
            {
                if (demands.Count >= 4) throw new InvalidOperationException("Four aircraft areas are already active. Close one before opening another.");
                demand = new(key, pollSeconds); demands.Add(key, demand);
            }
            if (demand.Subscribers.Count >= 16) throw new InvalidOperationException("This area's subscription limit has been reached.");
            demand.Subscribers.Add(channel);
            channel.Writer.TryWrite(Batch(demand, true, demand.Records, []));
        }
        try { await foreach (var batch in channel.Reader.ReadAllAsync(ct)) yield return batch; }
        finally
        {
            lock (gate)
            {
                demand.Subscribers.Remove(channel); channel.Writer.TryComplete();
                if (demand.Subscribers.Count == 0) { demands.Remove(key); demand.Cancellation.Cancel(); }
            }
        }
    }
    public void Cancel(string connectionId)
    {
        lock (gate) foreach (var (key, demand) in demands.Where(x => x.Key.ConnectionId == connectionId).ToArray())
        {
            demands.Remove(key); demand.Cancellation.Cancel();
            foreach (var subscriber in demand.Subscribers) subscriber.Writer.TryComplete();
        }
    }
    private static int JsonPollSeconds(string json, int fallback)
    {
        try { return Math.Clamp(System.Text.Json.JsonDocument.Parse(json).RootElement.GetProperty("pollSeconds").GetInt32(), 30, 600); }
        catch (System.Text.Json.JsonException) { return fallback; }
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            Demand? demand;
            lock (gate) demand = demands.Values.Where(x => x.Next <= DateTimeOffset.UtcNow).OrderBy(x => x.Next).FirstOrDefault();
            if (demand is not null && providerNext <= DateTimeOffset.UtcNow) await Refresh(demand, stoppingToken);
            await Task.Delay(500, stoppingToken);
        }
    }
    private async Task Refresh(Demand demand, CancellationToken stoppingToken)
    {
        using var cancellation = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, demand.Cancellation.Token);
        var ct = cancellation.Token;
        try
        {
            await using var scope = scopes.CreateAsyncScope(); var store = scope.ServiceProvider.GetRequiredService<AircraftStore>();
            var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
            var connection = await db.Connections.AsNoTracking().SingleOrDefaultAsync(x => x.Id == demand.Key.ConnectionId, ct);
            if (connection is null || connection.RemovedAt is not null || !connection.Enabled ||
                connection.Revision != demand.Key.Revision) { Cancel(demand.Key.ConnectionId); return; }
            if (!demand.Initialized)
            {
                var cached = await store.QueryAsync(Source.Id, demand.Query, Source.ResultLimit, ct, demand.Key.ConnectionId);
                Publish(demand, cached, new("loading", cached.Length > 0 ? "Cached observations loaded; refreshing from the aircraft source." : "Waiting for the first source response.",
                    cached.Length > 0 ? cached.Max(x => x.Observation.RetrievedAt) : null, null, null), false);
                demand.Initialized = true;
            }
            if (!sources.Supports(demand.Query))
            {
                demand.Next = DateTimeOffset.UtcNow.AddMinutes(5);
                Publish(demand, [], demand.Health with { State = "disabled", Message = $"Choose a collection radius between {Source.MinimumRadiusNm} and {Source.MaximumRadiusNm} NM for {Source.Name}.", NextAttemptAt = null }, false);
                return;
            }
            if (!Provider.Enabled || connection.CredentialRef is not null)
            {
                demand.Next = DateTimeOffset.UtcNow.AddMinutes(5);
                Publish(demand, demand.Records, demand.Health with { State = "disabled", Message = "The aircraft source is disabled in server configuration. Cached observations remain available.", NextAttemptAt = null }, demand.Truncated);
                return;
            }
            if (budget.Reserve("adsb-lol", Provider.MinimumRequestInterval) is { } ready)
            { demand.Next = ready; return; }
            providerNext = DateTimeOffset.UtcNow + Provider.MinimumRequestInterval;
            var fetch = await Provider.FetchAsync(demand.Query, ct);
            if (fetch.Records.Any(x => x.Record.Observation.SourceId != Source.Id ||
                x.Record.Observation.Provenance.SourceId != Source.Id))
                throw new SourceException("error", "The aircraft adapter returned mismatched source identities.");
            await store.SaveAsync(fetch, ct, demand.Key.ConnectionId, demand.Key.ConnectionId + ":positions", demand.Key.Revision);
            await store.PruneAsync(Source.Id, ct, demand.Key.ConnectionId);
            var records = await store.QueryAsync(Source.Id, demand.Query, Source.ResultLimit, ct, demand.Key.ConnectionId);
            records = records.Concat(fetch.Records.Select(x => x.Record).Where(x => x.Observation.Geometry is null))
                .DistinctBy(x => x.Entity.Id).Take(Source.ResultLimit).ToArray();
            demand.Failures = 0; demand.Next = DateTimeOffset.UtcNow.AddSeconds(demand.PollSeconds);
            Publish(demand, records, new(fetch.Rejected > 0 || fetch.Truncated ? "degraded" : "healthy",
                Source.Coverage + $" Last known positions remain visible for up to {AircraftCachePolicy.VisibleMinutes} minutes.",
                DateTimeOffset.UtcNow, demand.Next, fetch.Total, fetch.Rejected), fetch.Truncated || records.Length >= Source.ResultLimit);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            demand.Failures++;
            var retry = ex is SourceException source ? source.RetryAfter : null;
            var delay = TimeSpan.FromSeconds(Math.Min(300, demand.PollSeconds * Math.Pow(2, Math.Min(demand.Failures, 4))) + Random.Shared.Next(1, 6));
            if (retry > delay) delay = retry.Value;
            demand.Next = DateTimeOffset.UtcNow + delay;
            if (ex is SourceException { State: "rate_limited" }) providerNext = demand.Next;
            var message = ex is SourceException known ? known.Message : ex is Npgsql.NpgsqlException ?
                "Observation storage is unavailable. Check the database and migrations." : "The aircraft source could not be refreshed. Last available observations are retained.";
            Publish(demand, demand.Records, demand.Health with { State = ex is SourceException s ? s.State : "offline", Message = message, NextAttemptAt = demand.Next }, demand.Truncated);
            logger.LogWarning("Aircraft refresh failed ({ErrorType}); retry scheduled. No provider payload logged.", ex.GetType().Name);
        }
    }
    private void Publish(Demand demand, AircraftRecordDto[] records, SourceHealthDto health, bool truncated)
    {
        lock (gate)
        {
            if (demand.Cancellation.IsCancellationRequested) return;
            var (upserts, removals) = BatchChanges.Between(demand.Records, records, x => x.Entity.Id, x => x.Observation.Id);
            demand.Records = records; demand.Health = health; demand.Truncated = truncated; demand.Sequence++;
            var batch = Batch(demand, false, upserts, removals);
            foreach (var subscriber in demand.Subscribers) subscriber.Writer.TryWrite(batch);
        }
    }
    private AircraftBatchDto Batch(Demand d, bool reset, AircraftRecordDto[] upserts, string[] removals) =>
        new(1, d.Id, d.Sequence, DateTimeOffset.UtcNow, reset, d.Query, upserts, removals, d.Health,
            new(d.Records.Length, Source.ResultLimit, d.Truncated, Source.Coverage + " Removals only leave this result set."),
            Source with { PollSeconds = d.PollSeconds });
}
