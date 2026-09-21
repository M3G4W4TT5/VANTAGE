using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController(VantageDbContext db) : ControllerBase
{
    [HttpGet(Name = "GetHealth")]
    public async Task<HealthDto> Get(CancellationToken ct)
    {
        try { return new("ready", await db.Workspaces.AsNoTracking().AnyAsync(ct) ? "ready" : "empty", 1); }
        catch (Exception ex) when (ex is Npgsql.NpgsqlException or InvalidOperationException)
        { return new("degraded", "setup_required", 1); }
    }
}
