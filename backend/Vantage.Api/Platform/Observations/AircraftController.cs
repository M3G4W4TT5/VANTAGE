using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Platform.Observations;

[ApiController, Route("api/v1/aircraft")]
public sealed class AircraftController(AircraftStore store, AircraftSources sources, VantageDbContext db,
    ConnectionAccess connections) : ControllerBase
{
    [HttpGet("source")]
    public async Task<AircraftSourceDto> Source([FromQuery] string? connectionId, [FromQuery] string? workspaceId, CancellationToken ct)
    {
        var connection = await connections.RequireAsync(connectionId ?? BuiltinConnections.Aircraft, workspaceId, ct);
        if (connection.ConnectorTypeId != "adsb-lol") throw new PlatformAccessException(404);
        return sources.Active.Metadata with { PollSeconds = System.Text.Json.JsonDocument.Parse(connection.SettingsJson).RootElement.GetProperty("pollSeconds").GetInt32() };
    }
    [HttpGet]
    [ProducesResponseType<AircraftRecordDto[]>(200), ProducesResponseType<ApiError>(400)]
    public async Task<ActionResult<AircraftRecordDto[]>> Query([FromQuery] double longitude = 12, [FromQuery] double latitude = 58,
        [FromQuery] int radiusNm = 250, [FromQuery] string? connectionId = null, [FromQuery] string? workspaceId = null,
        CancellationToken cancellationToken = default)
    {
        var connection = await connections.RequireActiveAsync(connectionId ?? BuiltinConnections.Aircraft, workspaceId, cancellationToken);
        if (connection.ConnectorTypeId != "adsb-lol") throw new PlatformAccessException(404);
        var query = new AircraftQuery(longitude, latitude, radiusNm);
        if (!sources.Supports(query)) return BadRequest(new ApiError("invalid_area", $"Aircraft queries require longitude -180…180, latitude -85…85 and radius {sources.Active.Metadata.MinimumRadiusNm}…{sources.Active.Metadata.MaximumRadiusNm} NM."));
        return await store.QueryAsync(sources.Active.Metadata.Id, query.Normalized(), sources.Active.Metadata.ResultLimit,
            cancellationToken, connection.Id);
    }
    [HttpGet("observations/{id}")]
    [ProducesResponseType<AircraftRecordDto>(200), ProducesResponseType<ApiError>(404)]
    public async Task<ActionResult<AircraftRecordDto>> Observation(string id, [FromQuery] string? workspaceId, CancellationToken cancellationToken)
    {
        await connections.RequireEvidenceAsync(id, workspaceId, cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-AircraftCachePolicy.RetentionHours);
        var json = await db.Observations.AsNoTracking().Where(x => x.DataType == "aircraft" && x.Id == id && x.RetrievedAt >= cutoff).Select(x => x.RecordJson).SingleOrDefaultAsync(cancellationToken);
        return json is null ? NotFound(new ApiError("observation_unavailable", "This observation is not in the bounded live cache; it may have expired. A newer observation is not substituted.")) :
            JsonSerializer.Deserialize<AircraftRecordDto>(json, ContractJson.Options)!;
    }
}
