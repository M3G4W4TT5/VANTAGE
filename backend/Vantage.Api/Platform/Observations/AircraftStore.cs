using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

public sealed class CurrentAircraftRow
{
    public string ConnectionId { get; set; } = BuiltinConnections.Aircraft;
    public string SourceId { get; set; } = "";
    public string Id { get; set; } = "";
    public DateTimeOffset OrderTime { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
    public Point? Position { get; set; }
    public string RecordJson { get; set; } = "{}";
}
public sealed class AircraftStore(VantageDbContext db, ObservationValidation validation)
{
    public async Task SaveAsync(AircraftFetch fetch, CancellationToken ct, string connectionId = BuiltinConnections.Aircraft,
        string datasetId = BuiltinConnections.AircraftDataset, long configurationRevision = 1)
    {
        var deliveries = fetch.Records.DistinctBy(x => x.Record.Observation.Id).ToArray();
        var ids = deliveries.Select(x => x.Record.Observation.Id).ToArray();
        var entityIds = deliveries.Select(x => x.Record.Entity.Id).ToArray();
        var existing = await db.Observations.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var linked = (await db.ObservationDeliveries.Where(x => x.ConnectionId == connectionId &&
            x.ConfigurationRevision == configurationRevision && ids.Contains(x.ObservationId))
            .Select(x => x.ObservationId).ToArrayAsync(ct)).ToHashSet();
        var current = await db.CurrentAircraft.Where(x => x.ConnectionId == connectionId && entityIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        foreach (var delivery in deliveries)
        {
            var record = delivery.Record; var o = record.Observation;
            validation.Validate("AircraftRecord", record);
            if (existing.TryGetValue(o.Id, out var prior) &&
                (prior.DataType != "aircraft" || prior.SourceId != o.SourceId || prior.EntityId != o.EntityId))
                throw new SourceException("error", "The aircraft adapter reused another record's immutable ID.");
            var json = JsonSerializer.Serialize(record, ContractJson.Options);
            var position = o.Geometry is { } g ? new Point(g.Coordinates[0], g.Coordinates[1]) { SRID = 4326 } : null;
            if (prior is null) db.Observations.Add(new() { Id = o.Id, EntityId = o.EntityId, SourceId = o.SourceId, DataType = "aircraft",
                ObservedAt = o.ObservedAt, RetrievedAt = o.RetrievedAt, Position = position, RecordJson = json, RawJson = delivery.RawJson });
            if (!linked.Contains(o.Id)) db.ObservationDeliveries.Add(new() { ConnectionId = connectionId, DatasetId = datasetId,
                ObservationId = o.Id, ConfigurationRevision = configurationRevision, RetrievedAt = o.RetrievedAt });
            var order = o.Properties.PositionObservedAt ?? o.ObservedAt;
            if (!current.TryGetValue(o.EntityId, out var row))
            {
                row = new() { ConnectionId = connectionId, Id = o.EntityId, SourceId = o.SourceId }; db.CurrentAircraft.Add(row); current.Add(row.Id, row);
            }
            if (row.SourceId != o.SourceId) throw new InvalidOperationException("Aircraft entity IDs must be source scoped.");
            // Unknown or late source times never displace a known newer position.
            if (row.RecordJson != "{}" && (!order.HasValue || order.Value < row.OrderTime)) continue;
            row.OrderTime = order ?? DateTimeOffset.UnixEpoch; row.RetrievedAt = o.RetrievedAt;
            row.Position = position; row.RecordJson = json;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<AircraftRecordDto[]> QueryAsync(string sourceId, AircraftQuery query, int limit, CancellationToken ct,
        string connectionId = BuiltinConnections.Aircraft)
    {
        var center = new Point(query.Longitude, query.Latitude) { SRID = 4326 };
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-AircraftCachePolicy.VisibleMinutes);
        var rows = await db.CurrentAircraft.AsNoTracking().Where(x => x.ConnectionId == connectionId && x.SourceId == sourceId && x.RetrievedAt >= cutoff && x.Position != null &&
            x.Position.IsWithinDistance(center, query.RadiusNm * 1852d)).OrderByDescending(x => x.OrderTime)
            .ThenBy(x => x.Id).Take(Math.Clamp(limit, 1, AircraftCachePolicy.ResultLimit)).Select(x => x.RecordJson).ToListAsync(ct);
        return rows.Select(x => JsonSerializer.Deserialize<AircraftRecordDto>(x, ContractJson.Options)!).ToArray();
    }
    public async Task PruneAsync(string sourceId, CancellationToken ct, string connectionId = BuiltinConnections.Aircraft)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-AircraftCachePolicy.RetentionHours);
        var scope = db.CurrentAircraft.Where(x => x.ConnectionId == connectionId && x.SourceId == sourceId);
        await scope.Where(x => x.RetrievedAt < cutoff).ExecuteDeleteAsync(ct);
        var excess = scope.OrderByDescending(x => x.RetrievedAt).ThenBy(x => x.Id).Skip(10000).Select(x => x.Id);
        await scope.Where(x => excess.Contains(x.Id)).ExecuteDeleteAsync(ct);
        await ObservationRetention.PruneAsync(db, "aircraft", sourceId, cutoff, 50000, ct);
    }
}
