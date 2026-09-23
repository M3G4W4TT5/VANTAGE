using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;

namespace Vantage.Api.Platform.Preferences;

[ApiController]
[Route("api/v1/preferences")]
[Produces("application/json")]
public sealed class PersonalPreferencesController(VantageDbContext db, PlatformAccess access) : ControllerBase
{
    [HttpGet(Name = "GetPersonalPreferences")]
    [ProducesResponseType<PersonalPreferencesDto>(200)]
    public async Task<ActionResult<PersonalPreferencesDto>> Get(CancellationToken ct)
    {
        var user = await access.RequireUserAsync(ct);
        var row = await db.PersonalPreferences.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id, ct);
        return ToDto(row);
    }

    [HttpPut(Name = "UpdatePersonalPreferences")]
    [ProducesResponseType<PersonalPreferencesDto>(200)]
    [ProducesResponseType<ApiError>(400)]
    [ProducesResponseType<ApiError>(409)]
    public async Task<ActionResult<PersonalPreferencesDto>> Update(UpdatePersonalPreferencesRequest request, CancellationToken ct)
    {
        var user = await access.RequireUserAsync(ct);
        if (request.Theme is not ("dark" or "light"))
            return BadRequest(new ApiError("invalid_theme", "Choose the dark or light theme."));
        var row = await db.PersonalPreferences.SingleOrDefaultAsync(x => x.UserId == user.Id, ct);
        var region = request.DefaultRegion ?? row?.DefaultRegion ?? DisplayPreferences.DefaultRegion;
        var zone = request.TimeZone ?? row?.TimeZone ?? DisplayPreferences.DefaultTimeZone;
        if (!DisplayPreferences.Regions.ContainsKey(region))
            return BadRequest(new ApiError("invalid_region", "Choose an available map region."));
        if (!DisplayPreferences.ValidTimeZone(zone))
            return BadRequest(new ApiError("invalid_time_zone", "Choose a valid IANA time zone."));
        if (row?.Revision != request.Revision && !(row is null && request.Revision == 0))
            return Conflict(ConflictError);
        if (row is null)
        {
            row = new PersonalPreferencesRow { UserId = user.Id, Theme = request.Theme, DefaultRegion = region,
                TimeZone = zone, Revision = 1, UpdatedAt = DateTimeOffset.UtcNow };
            db.PersonalPreferences.Add(row);
        }
        else
        {
            row.Theme = request.Theme; row.DefaultRegion = region; row.TimeZone = zone;
            row.Revision++; row.UpdatedAt = DateTimeOffset.UtcNow;
        }
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(ConflictError); }
        catch (DbUpdateException error) when (error.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { return Conflict(ConflictError); }
        return ToDto(row);
    }

    private static ApiError ConflictError => new("revision_conflict", "Preferences changed elsewhere. Reload them before saving.");
    private static PersonalPreferencesDto ToDto(PersonalPreferencesRow? row) =>
        new(1, row?.Theme ?? "dark", row?.DefaultRegion ?? DisplayPreferences.DefaultRegion,
            row?.TimeZone ?? DisplayPreferences.DefaultTimeZone, row?.Revision ?? 0, row?.UpdatedAt);
}
