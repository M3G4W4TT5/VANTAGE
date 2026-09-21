using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Observations;

namespace Vantage.Api.Atlas;

[ApiController, Route("api/v1/aircraft")]
public sealed class AircraftController(AircraftStore store, AircraftSources sources, VantageDbContext db) : ControllerBase
{
    [HttpGet("source")]
    public AircraftSourceDto Source() => sources.Active.Metadata;
    [HttpGet]
    [ProducesResponseType<AircraftRecordDto[]>(200), ProducesResponseType<ApiError>(400)]
    public async Task<ActionResult<AircraftRecordDto[]>> Query([FromQuery] double longitude = 12, [FromQuery] double latitude = 58,
        [FromQuery] int radiusNm = 250, CancellationToken cancellationToken = default)
    {
        var query = new AircraftQuery(longitude, latitude, radiusNm);
        if (!sources.Supports(query)) return BadRequest(new ApiError("invalid_area", $"Aircraft queries require longitude -180…180, latitude -85…85 and radius {Source().MinimumRadiusNm}…{Source().MaximumRadiusNm} NM."));
        return await store.QueryAsync(Source().Id, query.Normalized(), Source().ResultLimit, cancellationToken);
    }
    [HttpGet("observations/{id}")]
    [ProducesResponseType<AircraftRecordDto>(200), ProducesResponseType<ApiError>(404)]
    public async Task<ActionResult<AircraftRecordDto>> Observation(string id, CancellationToken cancellationToken)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-AircraftCachePolicy.RetentionHours);
        var json = await db.Observations.AsNoTracking().Where(x => x.DataType == "aircraft" && x.Id == id && x.RetrievedAt >= cutoff).Select(x => x.RecordJson).SingleOrDefaultAsync(cancellationToken);
        return json is null ? NotFound(new ApiError("observation_unavailable", "This observation is not in the bounded live cache; it may have expired. A newer observation is not substituted.")) :
            JsonSerializer.Deserialize<AircraftRecordDto>(json, ContractJson.Options)!;
    }
}
