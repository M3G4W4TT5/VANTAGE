using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Connectors.GeoJson;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

// A configured catalog has one upstream poll for all authorized pane appearances.
public sealed class GeoJsonCoordinator(IServiceScopeFactory scopes, ProviderRequestBudget budget,
    HttpGeoJsonSource source, ILogger<GeoJsonCoordinator> logger) : BackgroundService, IConnectionDemandControl
{
    private sealed record Key(string ConnectionId, long Revision, string OwnerId);
    private sealed class Demand(Key key, HttpGeoJsonSettings settings)
    {
        public Key Key { get; } = key;
        public HttpGeoJsonSettings Settings { get; } = settings;
        public string SubscriptionId { get; } = Guid.NewGuid().ToString("N");
        public CancellationTokenSource Cancellation { get; } = new();
        public HashSet<Channel<GeoJsonBatchDto>> Subscribers { get; } = [];
        public GeoJsonRecordDto[] Records { get; set; } = [];
        public SourceHealthDto Health { get; set; } = new("loading", "Loading the local GeoJSON cache.", null, null, null);
        public GeoJsonCompletenessDto? Completeness { get; set; }
        public long Sequence { get; set; }
        public bool Initialized { get; set; }
        public int Failures { get; set; }
        public DateTimeOffset Next { get; set; }
    }
    private readonly object gate = new();
    private readonly Dictionary<Key, Demand> demands = [];
    private readonly Dictionary<Demand, Task> refreshing = [];
    private const int MaxConcurrentRefreshes = 4;

    public ConnectionDemandSnapshot Snapshot(string connectionId)
    {
        lock (gate)
        {
            var active = demands.Values.Where(x => x.Key.ConnectionId == connectionId).ToArray();
            if (active.Length == 0) return new(0, 0, null, null);
            return new(active.Length, active.Sum(x => x.Subscribers.Count), active[0].Health.State, active[0].Health.Message);
        }
    }

    public async IAsyncEnumerable<GeoJsonBatchDto> Subscribe(ConnectionRow connection,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var key = new Key(connection.Id, connection.Revision, connection.OwnerId);
        var channel = Channel.CreateBounded<GeoJsonBatchDto>(new BoundedChannelOptions(4) {
            FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        Demand demand;
        lock (gate)
        {
            if (!demands.TryGetValue(key, out demand!))
            {
                if (demands.Count >= 16) throw new InvalidOperationException("The GeoJSON connection demand limit has been reached.");
                demand = new(key, HttpGeoJsonSettings.Read(connection.SettingsJson));
                demands.Add(key, demand);
            }
            if (demand.Subscribers.Count >= 32) throw new InvalidOperationException("The GeoJSON subscription limit has been reached.");
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

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                Task[] completed;
                lock (gate)
                {
                    completed = refreshing.Where(x => x.Value.IsCompleted).Select(x => x.Value).ToArray();
                    foreach (var demand in refreshing.Where(x => x.Value.IsCompleted).Select(x => x.Key).ToArray())
                        refreshing.Remove(demand);
                    foreach (var demand in demands.Values.Where(x => !refreshing.ContainsKey(x) &&
                        x.Next <= DateTimeOffset.UtcNow).OrderBy(x => x.Next)
                        .Take(MaxConcurrentRefreshes - refreshing.Count))
                        refreshing.Add(demand, Task.Run(() => Refresh(demand, stoppingToken), stoppingToken));
                }
                foreach (var task in completed.Where(x => x.IsFaulted))
                    logger.LogError("GeoJSON refresh task stopped unexpectedly ({ErrorType}); source details omitted.",
                        task.Exception!.GetBaseException().GetType().Name);
                await Task.Delay(500, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        finally
        {
            Task[] pending;
            lock (gate)
            {
                foreach (var demand in demands.Values)
                {
                    demand.Cancellation.Cancel();
                    foreach (var channel in demand.Subscribers) channel.Writer.TryComplete();
                }
                pending = refreshing.Values.ToArray();
            }
            try { await Task.WhenAll(pending); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        }
    }

    private async Task Refresh(Demand demand, CancellationToken stop)
    {
        using var cancellation = CancellationTokenSource.CreateLinkedTokenSource(demand.Cancellation.Token, stop);
        var ct = cancellation.Token;
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<VantageDbContext>();
            var store = scope.ServiceProvider.GetRequiredService<GeoJsonStore>();
            var secrets = scope.ServiceProvider.GetRequiredService<ConnectionSecretStore>();
            var connection = await db.Connections.AsNoTracking().SingleOrDefaultAsync(x => x.Id == demand.Key.ConnectionId, ct);
            if (connection is null || connection.RemovedAt is not null || !connection.Enabled ||
                connection.Revision != demand.Key.Revision || connection.OwnerId != demand.Key.OwnerId)
            { Cancel(demand.Key.ConnectionId); return; }
            if (!demand.Initialized)
            {
                var saved = await store.QueryAsync(connection, ct);
                demand.Initialized = true;
                Publish(demand, saved.Records, new("loading", "Last valid GeoJSON snapshot loaded; refreshing the source.",
                    saved.Completeness.FeedRetrievedAt, null, saved.Completeness.ProviderCount), saved.Completeness);
            }
            var credential = demand.Settings.Authentication == "bearer" ? await secrets.ResolveAsync(connection, ct) : null;
            if (demand.Settings.Authentication == "bearer" && credential is null)
                throw new SourceException("setup_required", "The backend bearer credential is unavailable; cached features remain visible.");
            var providerKey = "http-geojson:" + new Uri(demand.Settings.Endpoint).Host;
            if (budget.Reserve(providerKey, TimeSpan.FromSeconds(10)) is { } ready)
            { demand.Next = ready; return; }
            demand.Next = DateTimeOffset.UtcNow.AddSeconds(demand.Settings.PollSeconds);
            var fetch = await source.FetchAsync(demand.Settings, credential, ct);
            await store.SaveAsync(connection, fetch, ct);
            await store.PruneAsync(demand.Settings.SourceId, ct);
            var current = await store.QueryAsync(connection, ct); demand.Failures = 0;
            Publish(demand, current.Records, new("healthy", "Current GeoJSON snapshot received. Missing features are absent only from this result set.",
                fetch.RetrievedAt, demand.Next, fetch.Records.Length), current.Completeness);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            demand.Failures++;
            var known = ex as SourceException;
            demand.Next = known?.State == "setup_required" ? DateTimeOffset.MaxValue : DateTimeOffset.UtcNow +
                SourceTransport.Backoff(demand.Settings.PollSeconds, demand.Failures, known?.RetryAfter);
            Publish(demand, demand.Records, demand.Health with { State = known?.State ?? "offline",
                Message = known?.Message ?? "GeoJSON source unavailable; the last valid snapshot is retained.",
                NextAttemptAt = demand.Next == DateTimeOffset.MaxValue ? null : demand.Next },
                demand.Completeness ?? EmptyCompleteness(demand));
            logger.LogWarning("GeoJSON refresh failed ({ErrorType}); endpoint, credential and payload omitted.", ex.GetType().Name);
        }
    }

    private static GeoJsonCompletenessDto EmptyCompleteness(Demand d) =>
        new(0, HttpGeoJsonSettings.FeatureLimit, false, d.Settings.Metadata.Coverage, null, null, 0);

    private void Publish(Demand demand, GeoJsonRecordDto[] current, SourceHealthDto health, GeoJsonCompletenessDto completeness)
    {
        lock (gate)
        {
            if (demand.Cancellation.IsCancellationRequested) return;
            var (upserts, removals) = BatchChanges.Between(demand.Records, current, x => x.Entity.Id, x => x.Observation.Id);
            demand.Records = current; demand.Health = health; demand.Completeness = completeness; demand.Sequence++;
            var batch = Batch(demand, false, upserts, removals);
            foreach (var subscriber in demand.Subscribers) subscriber.Writer.TryWrite(batch);
        }
    }
    private static GeoJsonBatchDto Batch(Demand d, bool reset, GeoJsonRecordDto[] upserts, string[] removals) =>
        new(1, d.SubscriptionId, d.Sequence, DateTimeOffset.UtcNow, reset, upserts, removals,
            d.Health, d.Completeness ?? EmptyCompleteness(d), d.Settings.Metadata);
}
