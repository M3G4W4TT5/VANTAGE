using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

// One source-defined catalog operation per authorized connection/revision, shared by its panes.
public sealed class EarthquakeCoordinator(IServiceScopeFactory scopes, EarthquakeSources sources, ProviderRequestBudget budget,
    ILogger<EarthquakeCoordinator> logger) : BackgroundService, IConnectionDemandControl
{
    private sealed record Key(string ConnectionId, long Revision, string OwnerId);
    private sealed class Demand(Key key, int pollSeconds)
    {
        public Key Key { get; } = key;
        public int PollSeconds { get; } = pollSeconds;
        public string SubscriptionId { get; } = Guid.NewGuid().ToString("N");
        public CancellationTokenSource Cancellation { get; } = new();
        public HashSet<Channel<EarthquakeBatchDto>> Subscribers { get; } = [];
        public EarthquakeRecordDto[] Records { get; set; } = [];
        public SourceHealthDto Health { get; set; } = new("loading", "Loading the local earthquake cache.", null, null, null);
        public EarthquakeCompletenessDto? Completeness { get; set; }
        public long Sequence { get; set; }
        public bool Initialized { get; set; }
        public int Failures { get; set; }
        public DateTimeOffset Next { get; set; }
    }
    private readonly object gate = new();
    private readonly Dictionary<Key, Demand> demands = [];
    private readonly Dictionary<string, DateTimeOffset> providerNext = [];
    public EarthquakeSourceDto Source => sources.Active.Metadata;

    public ConnectionDemandSnapshot Snapshot(string connectionId)
    {
        lock (gate)
        {
            var active = demands.Values.Where(x => x.Key.ConnectionId == connectionId).ToArray();
            if (active.Length == 0) return new(0, 0, null, null);
            var states = active.Select(x => x.Health.State).Distinct().ToArray();
            return new(active.Length, active.Sum(x => x.Subscribers.Count),
                states.Length == 1 ? states[0] : "mixed",
                states.Length == 1 ? active[0].Health.Message : "Active subscriptions have different source states.");
        }
    }

    public async IAsyncEnumerable<EarthquakeBatchDto> Subscribe([EnumeratorCancellation] CancellationToken ct,
        ConnectionRow? connection = null)
    {
        connection ??= new ConnectionRow { Id = BuiltinConnections.Earthquakes, OwnerId = "internal", Revision = 1,
            ConnectorTypeId = "usgs-earthquakes", SettingsJson = "{\"pollSeconds\":60}" };
        var key = new Key(connection.Id, connection.Revision, connection.OwnerId);
        var poll = JsonPollSeconds(connection.SettingsJson, Source.PollSeconds);
        var channel = Channel.CreateBounded<EarthquakeBatchDto>(new BoundedChannelOptions(4) {
            FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        Demand demand;
        lock (gate)
        {
            if (!demands.TryGetValue(key, out demand!))
            {
                if (demands.Count >= 8) throw new InvalidOperationException("The earthquake connection limit has been reached.");
                demand = new(key, poll) { Next = providerNext.GetValueOrDefault(connection.Id) };
                demands.Add(key, demand);
            }
            if (demand.Subscribers.Count >= 32) throw new InvalidOperationException("The earthquake subscription limit has been reached.");
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
        try { return Math.Clamp(System.Text.Json.JsonDocument.Parse(json).RootElement.GetProperty("pollSeconds").GetInt32(), 60, 3600); }
        catch (System.Text.Json.JsonException) { return fallback; }
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                Demand? demand;
                lock (gate) demand = demands.Values.Where(x => x.Next <= DateTimeOffset.UtcNow).OrderBy(x => x.Next).FirstOrDefault();
                if (demand is not null) await Refresh(demand, stoppingToken);
                await Task.Delay(500, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        finally { lock (gate) foreach (var demand in demands.Values) { demand.Cancellation.Cancel(); foreach (var channel in demand.Subscribers) channel.Writer.TryComplete(); } }
    }
    private async Task Refresh(Demand demand, CancellationToken stop)
    {
        using var cancellation = CancellationTokenSource.CreateLinkedTokenSource(demand.Cancellation.Token, stop);
        var ct = cancellation.Token;
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
            var store = scope.ServiceProvider.GetRequiredService<EarthquakeStore>();
            var connection = await db.Connections.AsNoTracking().SingleOrDefaultAsync(x => x.Id == demand.Key.ConnectionId, ct);
            if (connection is null || connection.RemovedAt is not null || !connection.Enabled ||
                connection.Revision != demand.Key.Revision) { Cancel(demand.Key.ConnectionId); return; }
            if (!demand.Initialized)
            {
                var saved = await store.QueryAsync(Source, ct, demand.Key.ConnectionId);
                demand.Initialized = true;
                Publish(demand, saved.Records, new("loading", "Cached earthquake snapshot loaded; refreshing the source.",
                    saved.Completeness.FeedRetrievedAt, null, saved.Completeness.ProviderCount,
                    saved.Completeness.RejectedCount), saved.Completeness);
            }
            if (!sources.Active.Enabled || connection.CredentialRef is not null)
            {
                demand.Next = DateTimeOffset.MaxValue;
                Publish(demand, demand.Records, demand.Health with { State = connection.CredentialRef is null ? "disabled" : "setup_required",
                    Message = "This connection cannot collect until its configuration is available.", NextAttemptAt = null },
                    demand.Completeness ?? EmptyCompleteness());
                return;
            }
            if (budget.Reserve("usgs-earthquakes", TimeSpan.FromSeconds(30)) is { } ready)
            { demand.Next = ready; return; }
            demand.Next = DateTimeOffset.UtcNow.AddSeconds(demand.PollSeconds);
            lock (gate) providerNext[demand.Key.ConnectionId] = demand.Next;
            var fetch = await sources.Active.FetchAsync(ct);
            if (fetch.Records.Length > Source.ResultLimit) throw new SourceException("error", "The earthquake adapter exceeded its declared result limit.");
            await store.SaveAsync(Source.Id, fetch, ct, demand.Key.ConnectionId, demand.Key.ConnectionId + ":events", demand.Key.Revision);
            await store.PruneAsync(Source.Id, ct, demand.Key.ConnectionId);
            var current = await store.QueryAsync(Source, ct, demand.Key.ConnectionId); demand.Failures = 0;
            var partial = current.Completeness.Truncated || fetch.Rejected > 0;
            Publish(demand, current.Records, new(partial ? "degraded" : "healthy",
                partial ? "Partial feed; previous members may be retained." : "Current source snapshot received. Event age is separate from feed freshness.",
                fetch.RetrievedAt, demand.Next, fetch.Total, fetch.Rejected), current.Completeness);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            demand.Failures++;
            var known = ex as SourceException;
            demand.Next = known?.State == "setup_required" ? DateTimeOffset.MaxValue : DateTimeOffset.UtcNow +
                SourceTransport.Backoff(demand.PollSeconds, demand.Failures, known?.RetryAfter);
            lock (gate) providerNext[demand.Key.ConnectionId] = demand.Next;
            Publish(demand, demand.Records, demand.Health with { State = known?.State ?? "offline", NextAttemptAt = demand.Next == DateTimeOffset.MaxValue ? null : demand.Next,
                Message = known?.Message ?? (ex is Npgsql.NpgsqlException ? "Earthquake storage is unavailable." : "The source is unavailable; last successful data is retained.") },
                demand.Completeness ?? EmptyCompleteness());
            logger.LogWarning("Earthquake refresh failed ({ErrorType}); no provider payload logged.", ex.GetType().Name);
        }
    }
    private EarthquakeCompletenessDto EmptyCompleteness() => new(0, Source.ResultLimit, false, Source.Coverage, null, null, null, 0);
    private void Publish(Demand demand, EarthquakeRecordDto[] current, SourceHealthDto status, EarthquakeCompletenessDto completeness)
    {
        lock (gate)
        {
            if (demand.Cancellation.IsCancellationRequested) return;
            var (upserts, removals) = BatchChanges.Between(demand.Records, current, x => x.Entity.Id, x => x.Observation.Id);
            demand.Records = current; demand.Health = status; demand.Completeness = completeness; demand.Sequence++;
            var batch = Batch(demand, false, upserts, removals);
            foreach (var subscriber in demand.Subscribers) subscriber.Writer.TryWrite(batch);
        }
    }
    private EarthquakeBatchDto Batch(Demand d, bool reset, EarthquakeRecordDto[] upserts, string[] removals) =>
        new(1, d.SubscriptionId, d.Sequence, DateTimeOffset.UtcNow, reset, upserts, removals, d.Health,
            d.Completeness ?? EmptyCompleteness(), Source with { PollSeconds = d.PollSeconds });
}
