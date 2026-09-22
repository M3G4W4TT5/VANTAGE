using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;
namespace Vantage.Api.Platform.Observations;

[ApiController, Route("api/v1/earthquakes")]
public sealed class EarthquakesController(EarthquakeStore store, EarthquakeSources sources, VantageDbContext db, PlatformAccess access) : ControllerBase
{
    [HttpGet("source")]
    public async Task<EarthquakeSourceDto> Source(CancellationToken ct) { await access.RequireDataAsync(ct); return sources.Active.Metadata; }
    [HttpGet]
    public async Task<EarthquakeSnapshotDto> Query(CancellationToken cancellationToken) { await access.RequireDataAsync(cancellationToken); return await store.QueryAsync(sources.Active.Metadata, cancellationToken); }
    [HttpGet("observations/{id}")]
    [ProducesResponseType<EarthquakeRecordDto>(200), ProducesResponseType<ApiError>(404)]
    public async Task<ActionResult<EarthquakeRecordDto>> Observation(string id, CancellationToken cancellationToken)
    {
        await access.RequireDataAsync(cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-EarthquakeCachePolicy.RetentionHours);
        var json = await db.Observations.AsNoTracking().Where(x => x.DataType == "earthquake" && x.Id == id && x.RetrievedAt >= cutoff)
            .Select(x => x.RecordJson).SingleOrDefaultAsync(cancellationToken);
        return json is null ? NotFound(new ApiError("observation_unavailable", "This earthquake version is not in the bounded cache. A newer version is not substituted.")) :
            JsonSerializer.Deserialize<EarthquakeRecordDto>(json, ContractJson.Options)!;
    }
    [HttpGet("entities/{id}/observations")]
    public async Task<EarthquakeRecordDto[]> Versions(string id, [FromQuery] string sourceId, CancellationToken cancellationToken)
    {
        await access.RequireDataAsync(cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-EarthquakeCachePolicy.RetentionHours);
        var rows = await db.Observations.AsNoTracking().Where(x => x.DataType == "earthquake" && x.SourceId == sourceId && x.EntityId == id && x.RetrievedAt >= cutoff)
            .OrderByDescending(x => x.RetrievedAt).ThenBy(x => x.Id).Take(20).Select(x => x.RecordJson).ToListAsync(cancellationToken);
        return rows.Select(x => JsonSerializer.Deserialize<EarthquakeRecordDto>(x, ContractJson.Options)!).ToArray();
    }
}
