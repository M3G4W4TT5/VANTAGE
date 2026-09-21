using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
namespace Vantage.Api.Platform.Observations;

public sealed class CurrentEarthquakeRow
{
    public string Id { get; set; } = "";
    public string SourceId { get; set; } = "";
    public DateTimeOffset? OrderTime { get; set; }
    public DateTimeOffset? OccurredAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public bool InLatestFeed { get; set; }
    public Point? Position { get; set; }
    public string RecordJson { get; set; } = "{}";
}
public sealed class EarthquakeFeedRow
{
    public string SourceId { get; set; } = "";
    public DateTimeOffset? GeneratedAt { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public int Total { get; set; }
    public int Rejected { get; set; }
    public bool Truncated { get; set; }
}
public sealed class EarthquakeStore(VantageDbContext db, ObservationValidation validation)
{
    public async Task SaveAsync(string sourceId, EarthquakeFetch fetch, CancellationToken ct)
    {
        if (fetch.Records.Length > EarthquakeCachePolicy.ResultLimit || fetch.Total < fetch.Records.Length || fetch.Rejected < 0)
            throw new SourceException("error", "The earthquake adapter exceeded the snapshot contract.");
        foreach (var delivery in fetch.Records)
        {
            var r = delivery.Record; var o = r.Observation;
            validation.Validate("EarthquakeRecord", r);
            if (r.Entity.Kind != "earthquake" || o.SourceId != sourceId || o.Provenance.SourceId != sourceId || o.EntityId != r.Entity.Id ||
                o.SupersedesObservationId is not null)
                throw new SourceException("error", "The earthquake adapter returned mismatched identities or a storage-owned revision link.");
        }
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var feed = await db.EarthquakeFeeds.SingleOrDefaultAsync(x => x.SourceId == sourceId, ct);
        if (feed?.GeneratedAt is { } previous && (fetch.GeneratedAt is null || fetch.GeneratedAt < previous))
            throw new SourceException("degraded", "An older feed snapshot was rejected. The latest successful snapshot is retained.");
        var deliveries = fetch.Records.DistinctBy(x => x.Record.Observation.Id).ToArray();
        var ids = deliveries.Select(x => x.Record.Observation.Id).ToArray();
        var existing = await db.Observations.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var current = await db.CurrentEarthquakes.Where(x => x.SourceId == sourceId).ToDictionaryAsync(x => x.Id, ct);
        // A partial feed cannot prove removal. Retain previous members and expose degraded completeness.
        if (!fetch.Truncated && fetch.Rejected == 0) foreach (var row in current.Values) row.InLatestFeed = false;
        foreach (var delivery in deliveries)
        {
            var record = delivery.Record; var o = record.Observation; var revision = o.Properties.SourceUpdatedAt;
            current.TryGetValue(o.EntityId, out var row);
            var isNewer = row is null || (revision.HasValue && (!row.OrderTime.HasValue || revision > row.OrderTime));
            if (!existing.TryGetValue(o.Id, out var saved))
            {
                var predecessor = isNewer && row is not null ? JsonSerializer.Deserialize<EarthquakeRecordDto>(row.RecordJson, ContractJson.Options)!.Observation.Id : null;
                record = record with { Observation = o with { SupersedesObservationId = predecessor } };
                saved = new() { Id = o.Id, EntityId = o.EntityId, SourceId = sourceId, DataType = "earthquake", ObservedAt = o.ObservedAt,
                    RetrievedAt = o.RetrievedAt, Position = Position(o.Geometry), RecordJson = JsonSerializer.Serialize(record, ContractJson.Options), RawJson = delivery.RawJson };
                db.Observations.Add(saved); existing.Add(o.Id, saved);
            }
            else if (saved.DataType != "earthquake" || saved.SourceId != sourceId || saved.EntityId != o.EntityId)
                throw new SourceException("error", "The earthquake adapter reused another record's immutable ID.");
            if (row is null)
            {
                row = new() { Id = o.EntityId, SourceId = sourceId }; db.CurrentEarthquakes.Add(row); current.Add(row.Id, row);
            }
            row.InLatestFeed = true; row.LastSeenAt = fetch.RetrievedAt;
            // Equal revision / conflicting content is retained as evidence, but first accepted current version wins.
            if (!isNewer) continue;
            row.OrderTime = revision; row.OccurredAt = o.ObservedAt; row.Position = saved.Position; row.RecordJson = saved.RecordJson;
        }
        if (feed is null) { feed = new() { SourceId = sourceId }; db.EarthquakeFeeds.Add(feed); }
        feed.GeneratedAt = fetch.GeneratedAt; feed.RetrievedAt = fetch.RetrievedAt; feed.Total = fetch.Total;
        feed.Rejected = fetch.Rejected; feed.Truncated = fetch.Truncated;
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
    }
    public async Task<EarthquakeSnapshotDto> QueryAsync(EarthquakeSourceDto source, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-source.CacheHours);
        var feed = await db.EarthquakeFeeds.AsNoTracking().SingleOrDefaultAsync(x => x.SourceId == source.Id && x.RetrievedAt >= cutoff, ct);
        var rows = feed is null ? [] : await db.CurrentEarthquakes.AsNoTracking().Where(x => x.SourceId == source.Id && x.InLatestFeed && x.LastSeenAt >= cutoff)
            .OrderByDescending(x => x.OccurredAt).ThenBy(x => x.Id).Take(source.ResultLimit + 1).Select(x => x.RecordJson).ToListAsync(ct);
        return new(rows.Take(source.ResultLimit).Select(x => JsonSerializer.Deserialize<EarthquakeRecordDto>(x, ContractJson.Options)!).ToArray(),
            new(Math.Min(rows.Count, source.ResultLimit), source.ResultLimit, (feed?.Truncated ?? false) || rows.Count > source.ResultLimit,
                source.Coverage + " Absence from a feed is not proof of event deletion.", feed?.GeneratedAt, feed?.RetrievedAt, feed?.Total, feed?.Rejected ?? 0), source);
    }
    public async Task PruneAsync(string sourceId, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-EarthquakeCachePolicy.RetentionHours);
        var scope = db.CurrentEarthquakes.Where(x => x.SourceId == sourceId);
        await scope.Where(x => x.LastSeenAt < cutoff).ExecuteDeleteAsync(ct);
        var excess = scope.OrderByDescending(x => x.LastSeenAt).ThenBy(x => x.Id).Skip(10000).Select(x => x.Id);
        await scope.Where(x => excess.Contains(x.Id)).ExecuteDeleteAsync(ct);
        await ObservationRetention.PruneAsync(db, "earthquake", sourceId, cutoff, EarthquakeCachePolicy.ObservationLimit, ct);
    }
    private static Point? Position(PointGeometryDto? geometry) => geometry is { } g ? new(g.Coordinates[0], g.Coordinates[1]) { SRID = 4326 } : null;
}
