using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Identity;

public sealed class PlatformUserRow
{
    public string Id { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string Subject { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public bool CanUseData { get; set; } = true;
    public long AccessRevision { get; set; } = 1;
}

public static class SessionClaims
{
    public const string UserId = "vantage_user_id";
    public const string SessionId = "vantage_session_id";
    public const string AccessRevision = "vantage_access_revision";
    public const string Issuer = "vantage_issuer";
    public const string Subject = "vantage_subject";
}

// Only the validated backend session supplies identity. Resource inputs never supply an owner.
public interface ICurrentSession
{
    string UserId { get; }
    string SessionId { get; }
}
public sealed class HttpCurrentSession(IHttpContextAccessor accessor) : ICurrentSession
{
    private ClaimsPrincipal Principal => accessor.HttpContext?.User ?? new();
    public string UserId => Principal.Identity?.IsAuthenticated == true
        ? Principal.FindFirstValue(SessionClaims.UserId) ?? throw new PlatformAccessException(401)
        : throw new PlatformAccessException(401);
    public string SessionId => Principal.FindFirstValue(SessionClaims.SessionId) ?? throw new PlatformAccessException(401);
}
public sealed class PlatformAccessException(int status) : Exception("Platform access denied.")
{
    public int Status { get; } = status;
}
public sealed class PlatformAccess(VantageDbContext db, ICurrentSession session)
{
    public async Task<PlatformUserRow> RequireUserAsync(CancellationToken ct)
    {
        var id = session.UserId;
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (user is not { Enabled: true }) throw new PlatformAccessException(403);
        return user;
    }
    public async Task RequireDataAsync(CancellationToken ct)
    {
        if (!(await RequireUserAsync(ct)).CanUseData) throw new PlatformAccessException(403);
    }
}

// Future recording uses this same lease. Disposing one lease never terminates another consumer.
public interface ISessionLifetime
{
    SessionLease Acquire(string sessionId, string userId);
    void Terminate(string sessionId);
}
public sealed class SessionLease(CancellationToken cancellation, Action release) : IDisposable
{
    private int disposed;
    public CancellationToken Cancellation { get; } = cancellation;
    public void Dispose() { if (Interlocked.Exchange(ref disposed, 1) == 0) release(); }
}
