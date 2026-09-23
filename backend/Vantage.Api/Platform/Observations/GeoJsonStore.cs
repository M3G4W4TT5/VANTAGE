using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Vantage.Api.Connectors.GeoJson;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

public sealed class CurrentGeoJsonRow
{
    public string ConnectionId { get; set; } = "";
    public string Id { get; set; } = "";
    public string SourceId { get; set; } = "";
    public DateTimeOffset? SourceTime { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public bool InLatestFeed { get; set; }
    public Geometry? Shape { get; set; }
    public string RecordJson { get; set; } = "{}";
}

public sealed class GeoJsonFeedRow
{
    public string ConnectionId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public DateTimeOffset RetrievedAt { get; set; }
    public int Total { get; set; }
}

public sealed class GeoJsonStore(VantageDbContext db, ObservationValidation validation)
{
    public async Task SaveAsync(ConnectionRow connection, GeoJsonFetch fetch, CancellationToken ct)
    {
        var settings = HttpGeoJsonSettings.Read(connection.SettingsJson);
        if (fetch.Records.Length > HttpGeoJsonSettings.FeatureLimit || fetch.Records.Select(x => x.Record.Entity.Id).Distinct().Count() != fetch.Records.Length)
            throw new SourceException("error", "The GeoJSON adapter exceeded the snapshot or identity contract.");
        foreach (var delivery in fetch.Records)
        {
            var record = delivery.Record; var observation = record.Observation;
            validation.Validate("GeoJsonRecord", record);
            if (observation.EntityId != record.Entity.Id || observation.SourceId != settings.SourceId ||
                observation.Provenance.SourceId != settings.SourceId || observation.SupersedesObservationId is not null)
                throw new SourceException("error", "The GeoJSON adapter returned mismatched source or record identities.");
        }
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var datasetId = connection.Id + ":features";
        var ids = fetch.Records.Select(x => x.Record.Observation.Id).ToArray();
        var existing = await db.Observations.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var linked = (await db.ObservationDeliveries.Where(x => x.ConnectionId == connection.Id &&
            x.ConfigurationRevision == connection.Revision && ids.Contains(x.ObservationId))
            .Select(x => x.ObservationId).ToArrayAsync(ct)).ToHashSet();
        var current = await db.CurrentGeoJson.Where(x => x.ConnectionId == connection.Id).ToDictionaryAsync(x => x.Id, ct);
        foreach (var row in current.Values) row.InLatestFeed = false;
        foreach (var delivery in fetch.Records)
        {
            var record = delivery.Record; var o = record.Observation;
            current.TryGetValue(o.EntityId, out var row);
            var previousId = row is null ? null : JsonSerializer.Deserialize<GeoJsonRecordDto>(row.RecordJson, ContractJson.Options)!.Observation.Id;
            if (!existing.TryGetValue(o.Id, out var saved))
            {
                if (previousId is not null) record = record with { Observation = o with { SupersedesObservationId = previousId } };
                saved = new ObservationRow { Id = o.Id, EntityId = o.EntityId, SourceId = settings.SourceId,
                    DataType = "geojson", ObservedAt = o.ObservedAt, RetrievedAt = o.RetrievedAt,
                    Position = delivery.Geometry is Point point ? point : null,
                    RecordJson = JsonSerializer.Serialize(record, ContractJson.Options), RawJson = delivery.RawJson };
                db.Observations.Add(saved); existing.Add(o.Id, saved);
            }
            else if (saved.DataType != "geojson" || saved.SourceId != settings.SourceId || saved.EntityId != o.EntityId)
                throw new SourceException("error", "The GeoJSON adapter reused another observation identity.");
            if (!linked.Contains(o.Id)) db.ObservationDeliveries.Add(new ObservationDeliveryRow { ConnectionId = connection.Id,
                DatasetId = datasetId, ObservationId = o.Id, ConfigurationRevision = connection.Revision,
                RetrievedAt = fetch.RetrievedAt });
            if (row is null)
            {
                row = new CurrentGeoJsonRow { ConnectionId = connection.Id, Id = o.EntityId, SourceId = settings.SourceId };
                db.CurrentGeoJson.Add(row); current.Add(row.Id, row);
            }
            row.InLatestFeed = true; row.LastSeenAt = fetch.RetrievedAt;
            if (previousId == o.Id) continue;
            row.SourceTime = o.ObservedAt; row.Shape = delivery.Geometry;
            row.RecordJson = saved.RecordJson;
        }
        var feed = await db.GeoJsonFeeds.SingleOrDefaultAsync(x => x.ConnectionId == connection.Id, ct);
        if (feed is null) { feed = new GeoJsonFeedRow { ConnectionId = connection.Id }; db.GeoJsonFeeds.Add(feed); }
        feed.SourceId = settings.SourceId; feed.RetrievedAt = fetch.RetrievedAt; feed.Total = fetch.Records.Length;
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
    }

    public async Task<GeoJsonSnapshotDto> QueryAsync(ConnectionRow connection, CancellationToken ct)
    {
        var source = HttpGeoJsonSettings.Read(connection.SettingsJson).Metadata;
        var feed = await db.GeoJsonFeeds.AsNoTracking().SingleOrDefaultAsync(x => x.ConnectionId == connection.Id, ct);
        var rows = feed is null ? [] : await db.CurrentGeoJson.AsNoTracking()
            .Where(x => x.ConnectionId == connection.Id && x.InLatestFeed)
            .OrderBy(x => x.Id).Take(HttpGeoJsonSettings.FeatureLimit + 1).Select(x => x.RecordJson).ToListAsync(ct);
        return new(rows.Take(HttpGeoJsonSettings.FeatureLimit).Select(x => JsonSerializer.Deserialize<GeoJsonRecordDto>(x, ContractJson.Options)!).ToArray(),
            new(Math.Min(rows.Count, HttpGeoJsonSettings.FeatureLimit), HttpGeoJsonSettings.FeatureLimit,
                rows.Count > HttpGeoJsonSettings.FeatureLimit, source.Coverage, feed?.RetrievedAt, feed?.Total, 0), source);
    }

    public async Task<(DateTimeOffset? RetrievedAt, int Records)> CacheStatusAsync(string connectionId, CancellationToken ct)
    {
        var feed = await db.GeoJsonFeeds.AsNoTracking().SingleOrDefaultAsync(x => x.ConnectionId == connectionId, ct);
        return (feed?.RetrievedAt, feed?.Total ?? 0);
    }

    public async Task PruneAsync(string sourceId, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-HttpGeoJsonSettings.CacheHours);
        await db.CurrentGeoJson.Where(x => !x.InLatestFeed && x.LastSeenAt < cutoff).ExecuteDeleteAsync(ct);
        await ObservationRetention.PruneAsync(db, "geojson", sourceId, cutoff, 50000, ct);
    }
}
