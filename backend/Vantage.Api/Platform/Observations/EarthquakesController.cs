using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Platform.Connections;
namespace Vantage.Api.Platform.Observations;

[ApiController, Route("api/v1/earthquakes")]
public sealed class EarthquakesController(EarthquakeStore store, EarthquakeSources sources, VantageDbContext db,
    PlatformAccess access, ConnectionAccess connections) : ControllerBase
{
    [HttpGet("source")]
    public async Task<EarthquakeSourceDto> Source([FromQuery] string? connectionId, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        var connection = await connections.RequireAsync(connectionId ?? BuiltinConnections.Earthquakes, workspaceId, ct);
        if (connection.ConnectorTypeId != "usgs-earthquakes") throw new PlatformAccessException(404);
        var poll = System.Text.Json.JsonDocument.Parse(connection.SettingsJson).RootElement.GetProperty("pollSeconds").GetInt32();
        return sources.Active.Metadata with { PollSeconds = poll, StaleAfterSeconds = Math.Max(180, poll * 3) };
    }
    [HttpGet]
    public async Task<EarthquakeSnapshotDto> Query([FromQuery] string? connectionId, [FromQuery] string? workspaceId, CancellationToken cancellationToken)
    {
        var connection = await connections.RequireActiveAsync(connectionId ?? BuiltinConnections.Earthquakes, workspaceId, cancellationToken);
        if (connection.ConnectorTypeId != "usgs-earthquakes") throw new PlatformAccessException(404);
        return await store.QueryAsync(sources.Active.Metadata, cancellationToken, connection.Id);
    }
    [HttpGet("observations/{id}")]
    [ProducesResponseType<EarthquakeRecordDto>(200), ProducesResponseType<ApiError>(404)]
    public async Task<ActionResult<EarthquakeRecordDto>> Observation(string id, [FromQuery] string? workspaceId, CancellationToken cancellationToken)
    {
        await connections.RequireEvidenceAsync(id, workspaceId, cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-EarthquakeCachePolicy.RetentionHours);
        var json = await db.Observations.AsNoTracking().Where(x => x.DataType == "earthquake" && x.Id == id && x.RetrievedAt >= cutoff)
            .Select(x => x.RecordJson).SingleOrDefaultAsync(cancellationToken);
        return json is null ? NotFound(new ApiError("observation_unavailable", "This earthquake version is not in the bounded cache. A newer version is not substituted.")) :
            JsonSerializer.Deserialize<EarthquakeRecordDto>(json, ContractJson.Options)!;
    }
    [HttpGet("entities/{id}/observations")]
    public async Task<EarthquakeRecordDto[]> Versions(string id, [FromQuery] string sourceId, [FromQuery] string? workspaceId,
        CancellationToken cancellationToken)
    {
        await access.RequireDataAsync(cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-EarthquakeCachePolicy.RetentionHours);
        var owner = await access.RequireUserAsync(cancellationToken);
        var visibleIds = from delivery in db.ObservationDeliveries.AsNoTracking()
            join connection in db.Connections.AsNoTracking() on delivery.ConnectionId equals connection.Id
            where connection.OwnerId == owner.Id && (connection.Scope == "global" || (connection.WorkspaceId == workspaceId &&
                db.Workspaces.Any(x => x.Id == workspaceId && x.OwnerId == owner.Id)))
            select delivery.ObservationId;
        var rows = await db.Observations.AsNoTracking().Where(x => x.DataType == "earthquake" && x.SourceId == sourceId &&
            x.EntityId == id && x.RetrievedAt >= cutoff && visibleIds.Contains(x.Id))
            .OrderByDescending(x => x.RetrievedAt).ThenBy(x => x.Id).Take(20).Select(x => x.RecordJson).ToListAsync(cancellationToken);
        return rows.Select(x => JsonSerializer.Deserialize<EarthquakeRecordDto>(x, ContractJson.Options)!).ToArray();
    }
}
