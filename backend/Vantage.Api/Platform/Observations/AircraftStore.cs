using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Observations;

public sealed class ObservationRow
{
    public string Id { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public DateTimeOffset? ObservedAt { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public Point? Position { get; set; }
    public string RecordJson { get; set; } = "{}";
    public string RawJson { get; set; } = "{}";
}
public sealed class CurrentAircraftRow
{
    public string SourceId { get; set; } = "";
    public string Id { get; set; } = "";
    public DateTimeOffset OrderTime { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public Point? Position { get; set; }
    public string RecordJson { get; set; } = "{}";
}
public sealed class AircraftStore(VantageDbContext db)
{
    public async Task SaveAsync(AircraftFetch fetch, CancellationToken ct)
    {
        var deliveries = fetch.Records.DistinctBy(x => x.Record.Observation.Id).ToArray();
        var ids = deliveries.Select(x => x.Record.Observation.Id).ToArray();
        var entityIds = deliveries.Select(x => x.Record.Entity.Id).ToArray();
        var existing = (await db.Observations.Where(x => ids.Contains(x.Id)).Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        var current = await db.CurrentAircraft.Where(x => entityIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        foreach (var delivery in deliveries)
        {
            var record = delivery.Record; var o = record.Observation;
            if (existing.Contains(o.Id)) continue;
            var json = JsonSerializer.Serialize(record, ContractJson.Options);
            var position = o.Geometry is { } g ? new Point(g.Coordinates[0], g.Coordinates[1]) { SRID = 4326 } : null;
            if (!existing.Contains(o.Id)) db.Observations.Add(new() { Id = o.Id, EntityId = o.EntityId, SourceId = o.SourceId,
                ObservedAt = o.ObservedAt, RetrievedAt = o.RetrievedAt, Position = position, RecordJson = json, RawJson = delivery.RawJson });
            var order = o.Properties.PositionObservedAt ?? o.ObservedAt;
            if (!current.TryGetValue(o.EntityId, out var row))
            {
                row = new() { Id = o.EntityId, SourceId = o.SourceId }; db.CurrentAircraft.Add(row); current.Add(row.Id, row);
            }
            if (row.SourceId != o.SourceId) throw new InvalidOperationException("Aircraft entity IDs must be source scoped.");
            // Unknown or late source times never displace a known newer position.
            if (row.RecordJson != "{}" && (!order.HasValue || order.Value < row.OrderTime)) continue;
            row.OrderTime = order ?? DateTimeOffset.UnixEpoch; row.RetrievedAt = o.RetrievedAt;
            row.Position = position; row.RecordJson = json;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<AircraftRecordDto[]> QueryAsync(string sourceId, AircraftQuery query, int limit, CancellationToken ct)
    {
        var center = new Point(query.Longitude, query.Latitude) { SRID = 4326 };
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-AircraftCachePolicy.VisibleMinutes);
        var rows = await db.CurrentAircraft.AsNoTracking().Where(x => x.SourceId == sourceId && x.RetrievedAt >= cutoff && x.Position != null &&
            x.Position.IsWithinDistance(center, query.RadiusNm * 1852d)).OrderByDescending(x => x.OrderTime)
            .ThenBy(x => x.Id).Take(Math.Clamp(limit, 1, AircraftCachePolicy.ResultLimit)).Select(x => x.RecordJson).ToListAsync(ct);
        return rows.Select(x => JsonSerializer.Deserialize<AircraftRecordDto>(x, ContractJson.Options)!).ToArray();
    }
    public async Task PruneAsync(CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-AircraftCachePolicy.RetentionHours);
        await db.CurrentAircraft.Where(x => x.RetrievedAt < cutoff).ExecuteDeleteAsync(ct);
        await db.Database.ExecuteSqlRawAsync("DELETE FROM atlas.current_aircraft WHERE \"Id\" IN (SELECT \"Id\" FROM atlas.current_aircraft ORDER BY \"RetrievedAt\" DESC, \"Id\" OFFSET 10000)", ct);
        await db.Observations.Where(x => x.RetrievedAt < cutoff).ExecuteDeleteAsync(ct);
        // This is a bounded live cache, not a recording archive. Latest entity projections remain independently available.
        await db.Database.ExecuteSqlRawAsync("DELETE FROM platform.observations WHERE \"Id\" IN (SELECT \"Id\" FROM platform.observations ORDER BY \"RetrievedAt\" DESC, \"Id\" OFFSET 50000)", ct);
    }
}
