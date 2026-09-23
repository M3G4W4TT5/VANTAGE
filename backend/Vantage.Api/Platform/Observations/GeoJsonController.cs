using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Connectors.GeoJson;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Connections;
using Vantage.Api.Platform.Identity;

namespace Vantage.Api.Platform.Observations;

[ApiController, Route("api/v1/geojson")]
public sealed class GeoJsonController(GeoJsonStore store, VantageDbContext db, PlatformAccess access,
    ConnectionAccess connections) : ControllerBase
{
    [HttpGet("source")]
    public async Task<GeoJsonSourceDto> Source([FromQuery] string connectionId, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        var connection = await connections.RequireAsync(connectionId, workspaceId, ct);
        if (connection.ConnectorTypeId != "http-geojson") throw new PlatformAccessException(404);
        return HttpGeoJsonSettings.Read(connection.SettingsJson).Metadata;
    }

    [HttpGet]
    public async Task<GeoJsonSnapshotDto> Query([FromQuery] string connectionId, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        var connection = await connections.RequireActiveAsync(connectionId, workspaceId, ct);
        if (connection.ConnectorTypeId != "http-geojson") throw new PlatformAccessException(404);
        return await store.QueryAsync(connection, ct);
    }

    [HttpGet("observations/{id}")]
    [ProducesResponseType<GeoJsonRecordDto>(200), ProducesResponseType<ApiError>(404)]
    public async Task<ActionResult<GeoJsonRecordDto>> Observation(string id, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        await connections.RequireEvidenceAsync(id, workspaceId, ct);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-HttpGeoJsonSettings.CacheHours);
        var json = await db.Observations.AsNoTracking().Where(x => x.Id == id && x.DataType == "geojson" && x.RetrievedAt >= cutoff)
            .Select(x => x.RecordJson).SingleOrDefaultAsync(ct);
        return json is null ? NotFound(new ApiError("observation_unavailable", "This GeoJSON version is no longer in the bounded evidence cache.")) :
            JsonSerializer.Deserialize<GeoJsonRecordDto>(json, ContractJson.Options)!;
    }

    [HttpGet("entities/{id}/observations")]
    public async Task<GeoJsonRecordDto[]> Versions(string id, [FromQuery] string sourceId, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        if (!owner.CanUseData) throw new PlatformAccessException(403);
        var visibleIds = from delivery in db.ObservationDeliveries.AsNoTracking()
            join connection in db.Connections.AsNoTracking() on delivery.ConnectionId equals connection.Id
            where connection.OwnerId == owner.Id && (connection.Scope == "global" || (connection.WorkspaceId == workspaceId &&
                db.Workspaces.Any(x => x.Id == workspaceId && x.OwnerId == owner.Id)))
            select delivery.ObservationId;
        var cutoff = DateTimeOffset.UtcNow.AddHours(-HttpGeoJsonSettings.CacheHours);
        var rows = await db.Observations.AsNoTracking().Where(x => x.DataType == "geojson" && x.SourceId == sourceId &&
            x.EntityId == id && x.RetrievedAt >= cutoff && visibleIds.Contains(x.Id))
            .OrderByDescending(x => x.RetrievedAt).ThenBy(x => x.Id).Take(20).Select(x => x.RecordJson).ToListAsync(ct);
        return rows.Select(x => JsonSerializer.Deserialize<GeoJsonRecordDto>(x, ContractJson.Options)!).ToArray();
    }
}
