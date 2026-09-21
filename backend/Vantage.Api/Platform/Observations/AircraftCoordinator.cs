using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Observations;

// One bounded collector shared by equivalent pane/tab demands. No demand means no provider requests.
public sealed class AircraftCoordinator(IServiceScopeFactory scopes, AircraftSources sources,
    ILogger<AircraftCoordinator> logger) : BackgroundService
{
    private sealed class Demand(AircraftQuery query)
    {
        public AircraftQuery Query { get; } = query;
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
    private readonly Dictionary<AircraftQuery, Demand> demands = [];
    private DateTimeOffset providerNext;
    private IAircraftSource Provider => sources.Active;
    public AircraftSourceDto Source => Provider.Metadata;
    public int PollSeconds => Source.PollSeconds;

    public async IAsyncEnumerable<AircraftBatchDto> Subscribe(AircraftQuery query, [EnumeratorCancellation] CancellationToken ct)
    {
        if (!query.IsValid) throw new ArgumentException($"Use longitude -180…180, latitude -85…85 and radius {Source.MinimumRadiusNm}…{Source.MaximumRadiusNm} NM.");
        query = query.Normalized();
        var channel = Channel.CreateBounded<AircraftBatchDto>(new BoundedChannelOptions(4) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        Demand demand;
        lock (gate)
        {
            if (!demands.TryGetValue(query, out demand!))
            {
                if (demands.Count >= 4) throw new InvalidOperationException("Four aircraft areas are already active. Close one before opening another.");
                demand = new(query); demands.Add(query, demand);
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
                if (demand.Subscribers.Count == 0) { demands.Remove(query); demand.Cancellation.Cancel(); }
            }
        }
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
            if (!demand.Initialized)
            {
                var cached = await store.QueryAsync(Source.Id, demand.Query, Source.ResultLimit, ct);
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
            if (!Provider.Enabled)
            {
                demand.Next = DateTimeOffset.UtcNow.AddMinutes(5);
                Publish(demand, demand.Records, demand.Health with { State = "disabled", Message = "The aircraft source is disabled in server configuration. Cached observations remain available.", NextAttemptAt = null }, demand.Truncated);
                return;
            }
            providerNext = DateTimeOffset.UtcNow + Provider.MinimumRequestInterval;
            var fetch = await Provider.FetchAsync(demand.Query, ct);
            if (fetch.Records.Any(x => x.Record.Observation.SourceId != Source.Id ||
                x.Record.Observation.Provenance.SourceId != Source.Id))
                throw new SourceException("error", "The aircraft adapter returned mismatched source identities.");
            await store.SaveAsync(fetch, ct);
            await store.PruneAsync(ct);
            var records = await store.QueryAsync(Source.Id, demand.Query, Source.ResultLimit, ct);
            records = records.Concat(fetch.Records.Select(x => x.Record).Where(x => x.Observation.Geometry is null))
                .DistinctBy(x => x.Entity.Id).Take(Source.ResultLimit).ToArray();
            demand.Failures = 0; demand.Next = DateTimeOffset.UtcNow.AddSeconds(PollSeconds);
            Publish(demand, records, new(fetch.Rejected > 0 || fetch.Truncated ? "degraded" : "healthy",
                Source.Coverage + $" Last known positions remain visible for up to {AircraftCachePolicy.VisibleMinutes} minutes.",
                DateTimeOffset.UtcNow, demand.Next, fetch.Total, fetch.Rejected), fetch.Truncated || records.Length >= Source.ResultLimit);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            demand.Failures++;
            var retry = ex is SourceException source ? source.RetryAfter : null;
            var delay = TimeSpan.FromSeconds(Math.Min(300, PollSeconds * Math.Pow(2, Math.Min(demand.Failures, 4))) + Random.Shared.Next(1, 6));
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
            var old = demand.Records.ToDictionary(x => x.Entity.Id, x => x.Observation.Id);
            var ids = records.Select(x => x.Entity.Id).ToHashSet();
            var upserts = records.Where(x => !old.TryGetValue(x.Entity.Id, out var id) || id != x.Observation.Id).ToArray();
            var removals = old.Keys.Where(x => !ids.Contains(x)).ToArray();
            demand.Records = records; demand.Health = health; demand.Truncated = truncated; demand.Sequence++;
            var batch = Batch(demand, false, upserts, removals);
            foreach (var subscriber in demand.Subscribers) subscriber.Writer.TryWrite(batch);
        }
    }
    private AircraftBatchDto Batch(Demand d, bool reset, AircraftRecordDto[] upserts, string[] removals) =>
        new(1, d.Id, d.Sequence, DateTimeOffset.UtcNow, reset, d.Query, upserts, removals, d.Health,
            new(d.Records.Length, Source.ResultLimit, d.Truncated, Source.Coverage + " Removals only leave this result set."), Source);
}
