using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Vantage.Api.Contracts;
namespace Vantage.Api.Platform.Observations;

// One global source-defined snapshot shared across all earthquake panes/tabs. No per-filter upstream requests.
public sealed class EarthquakeCoordinator(IServiceScopeFactory scopes, EarthquakeSources sources,
    ILogger<EarthquakeCoordinator> logger) : BackgroundService
{
    private readonly object gate = new();
    private readonly HashSet<Channel<EarthquakeBatchDto>> subscribers = [];
    private CancellationTokenSource demandCancellation = new();
    private readonly string subscriptionId = Guid.NewGuid().ToString("N");
    private EarthquakeRecordDto[] records = [];
    private SourceHealthDto health = new("loading", "Loading the local earthquake cache.", null, null, null);
    private EarthquakeCompletenessDto? completeness;
    private long sequence;
    private bool initialized;
    private int failures;
    private DateTimeOffset next;
    public EarthquakeSourceDto Source => sources.Active.Metadata;

    public async IAsyncEnumerable<EarthquakeBatchDto> Subscribe([EnumeratorCancellation] CancellationToken ct)
    {
        var channel = Channel.CreateBounded<EarthquakeBatchDto>(new BoundedChannelOptions(4) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        lock (gate)
        {
            if (subscribers.Count >= 32) throw new InvalidOperationException("The earthquake subscription limit has been reached.");
            if (subscribers.Count == 0) { demandCancellation.Dispose(); demandCancellation = new(); }
            subscribers.Add(channel); channel.Writer.TryWrite(Batch(true, records, []));
        }
        try { await foreach (var batch in channel.Reader.ReadAllAsync(ct)) yield return batch; }
        finally
        {
            lock (gate)
            {
                subscribers.Remove(channel); channel.Writer.TryComplete();
                if (subscribers.Count == 0) demandCancellation.Cancel();
            }
        }
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                CancellationToken? demand;
                lock (gate) demand = subscribers.Count > 0 && next <= DateTimeOffset.UtcNow ? demandCancellation.Token : null;
                if (demand is { } token) await Refresh(token, stoppingToken);
                await Task.Delay(500, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        finally { lock (gate) { foreach (var channel in subscribers) channel.Writer.TryComplete(); demandCancellation.Cancel(); } }
    }
    private async Task Refresh(CancellationToken demand, CancellationToken stop)
    {
        using var cancellation = CancellationTokenSource.CreateLinkedTokenSource(demand, stop); var ct = cancellation.Token;
        try
        {
            await using var scope = scopes.CreateAsyncScope(); var store = scope.ServiceProvider.GetRequiredService<EarthquakeStore>();
            if (!initialized)
            {
                var saved = await store.QueryAsync(Source, ct); initialized = true;
                Publish(saved.Records, new("loading", "Cached earthquake snapshot loaded; refreshing the source.", saved.Completeness.FeedRetrievedAt, null,
                    saved.Completeness.ProviderCount, saved.Completeness.RejectedCount), saved.Completeness);
            }
            if (!sources.Active.Enabled)
            {
                next = DateTimeOffset.MaxValue;
                Publish(records, health with { State = "disabled", Message = "The earthquake source is disabled in server configuration. Cached events remain available.", NextAttemptAt = null }, completeness!);
                return;
            }
            // Persist cadence in coordinator memory across subscriber churn; closing/reopening never accelerates polling.
            next = DateTimeOffset.UtcNow.AddSeconds(Source.PollSeconds);
            var fetch = await sources.Active.FetchAsync(ct);
            if (fetch.Records.Length > Source.ResultLimit) throw new SourceException("error", "The earthquake adapter exceeded its declared result limit.");
            await store.SaveAsync(Source.Id, fetch, ct); await store.PruneAsync(Source.Id, ct);
            var current = await store.QueryAsync(Source, ct); failures = 0;
            var partial = current.Completeness.Truncated || fetch.Rejected > 0;
            Publish(current.Records, new(partial ? "degraded" : "healthy",
                partial ? "Partial feed: rejected or limited records; previous members may be retained. See completeness." : "Current source snapshot received. Event age is separate from feed freshness.",
                fetch.RetrievedAt, next, fetch.Total, fetch.Rejected), current.Completeness);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            failures++;
            var known = ex as SourceException;
            next = known?.State == "setup_required" ? DateTimeOffset.MaxValue : DateTimeOffset.UtcNow + SourceTransport.Backoff(Source.PollSeconds, failures, known?.RetryAfter);
            Publish(records, health with { State = known?.State ?? "offline", NextAttemptAt = next == DateTimeOffset.MaxValue ? null : next,
                Message = known?.Message ?? (ex is Npgsql.NpgsqlException ? "Earthquake storage is unavailable. Check the database and migrations." : "The earthquake source is unavailable. Last successful data is retained.") },
                completeness ?? EmptyCompleteness());
            logger.LogWarning("Earthquake refresh failed ({ErrorType}); no provider payload logged.", ex.GetType().Name);
        }
    }
    private EarthquakeCompletenessDto EmptyCompleteness() => new(0, Source.ResultLimit, false, Source.Coverage, null, null, null, 0);
    private void Publish(EarthquakeRecordDto[] current, SourceHealthDto status, EarthquakeCompletenessDto coverage)
    {
        lock (gate)
        {
            var (upserts, removals) = BatchChanges.Between(records, current, x => x.Entity.Id, x => x.Observation.Id);
            records = current; health = status; completeness = coverage; sequence++;
            var batch = Batch(false, upserts, removals);
            foreach (var channel in subscribers) channel.Writer.TryWrite(batch);
        }
    }
    private EarthquakeBatchDto Batch(bool reset, EarthquakeRecordDto[] upserts, string[] removals) =>
        new(1, subscriptionId, sequence, DateTimeOffset.UtcNow, reset, upserts, removals, health, completeness ?? EmptyCompleteness(), Source);
}
