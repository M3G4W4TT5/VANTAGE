using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Identity;

// In-memory tickets intentionally expire on backend restart. No tokens enter a cookie, database or backup.
public sealed class BackendSessions(IOptions<IdentityOptions> configured, TimeProvider time) : ITicketStore, ISessionLifetime
{
    public sealed class Session(AuthenticationTicket ticket, DateTimeOffset expiresAt)
    {
        public AuthenticationTicket Ticket { get; } = ticket;
        public string Id => Ticket.Principal.FindFirstValue(SessionClaims.SessionId)!;
        public string UserId => Ticket.Principal.FindFirstValue(SessionClaims.UserId)!;
        public string PublicKey { get; } = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        public DateTimeOffset ExpiresAt { get; } = expiresAt;
        public DateTimeOffset CheckedAt { get; set; }
        public long AccessRevision => long.Parse(Ticket.Principal.FindFirstValue(SessionClaims.AccessRevision)!);
        public bool CanUseData { get; set; } = true;
        public CancellationTokenSource Ended { get; } = new();
        public CancellationTokenSource DataEnded { get; set; } = new();
        public SessionProbe Probe => new(Ticket.Principal.FindFirstValue(SessionClaims.Issuer)!, Ticket.Principal.FindFirstValue(SessionClaims.Subject)!, Ticket.Properties.GetTokenValue("refresh_token")!);
    }
    private readonly ConcurrentDictionary<string, Session> sessions = new();
    private readonly object issuance = new();
    public Session[] Active => sessions.Values.ToArray();
    public Session? Find(string id)
    {
        if (!sessions.TryGetValue(id, out var entry)) return null;
        if (entry.ExpiresAt <= time.GetUtcNow() || entry.Ended.IsCancellationRequested) { Terminate(id); return null; }
        return entry;
    }
    public Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var id = ticket.Principal.FindFirstValue(SessionClaims.SessionId) ?? throw new InvalidOperationException("A backend session ID is required.");
        var expires = time.GetUtcNow().AddMinutes(configured.Value.SessionMinutes);
        if (ticket.Properties.ExpiresUtc < expires) expires = ticket.Properties.ExpiresUtc.Value;
        ticket.Properties.ExpiresUtc = expires; ticket.Properties.AllowRefresh = false;
        var entry = new Session(ticket, expires) { CheckedAt = time.GetUtcNow(),
            CanUseData = ticket.Principal.FindFirstValue("vantage_data") == "true" };
        if (!entry.CanUseData) entry.DataEnded.Cancel();
        lock (issuance)
        {
            foreach (var existing in sessions.Values) if (existing.ExpiresAt <= time.GetUtcNow()) Terminate(existing.Id);
            if (sessions.Count >= 64) throw new InvalidOperationException("The local session limit has been reached.");
            if (!sessions.TryAdd(id, entry)) throw new InvalidOperationException("A session ID may only be issued once.");
        }
        return Task.FromResult(id);
    }
    public Task RenewAsync(string key, AuthenticationTicket ticket) => Task.CompletedTask; // Fixed lifetime, no sliding refresh.
    public Task<AuthenticationTicket?> RetrieveAsync(string key) => Task.FromResult(Find(key)?.Ticket);
    public Task RemoveAsync(string key) { Terminate(key); return Task.CompletedTask; }
    public void Terminate(string sessionId)
    {
        if (sessions.TryRemove(sessionId, out var entry)) { entry.Ended.Cancel(); entry.DataEnded.Cancel(); }
    }
    public void SetDataAccess(Session entry, bool allowed)
    {
        lock (entry)
        {
            if (entry.CanUseData == allowed) return;
            entry.CanUseData = allowed;
            if (!allowed) entry.DataEnded.Cancel();
            else entry.DataEnded = new(); // Previously stopped demand remains stopped.
        }
    }
    public SessionLease Acquire(string sessionId, string userId)
    {
        var entry = Find(sessionId);
        if (entry is null || entry.UserId != userId) throw new PlatformAccessException(401);
        lock (entry)
        {
            if (!entry.CanUseData) throw new PlatformAccessException(403);
            var combined = CancellationTokenSource.CreateLinkedTokenSource(entry.Ended.Token, entry.DataEnded.Token);
            return new(combined.Token, combined.Dispose);
        }
    }
}

public sealed class SessionMonitor(BackendSessions sessions, IServiceScopeFactory scopes, IIdentitySessionProbe provider,
    IOptions<IdentityOptions> configured, TimeProvider time, ILogger<SessionMonitor>? logger = null) : BackgroundService
{
    public async Task CheckAsync(CancellationToken ct = default)
    {
        var options = configured.Value;
        // Maximum 64 sessions, checked concurrently. One slow provider cannot delay another user's cancellation.
        await Task.WhenAll(sessions.Active.Select(async entry =>
        {
            if (sessions.Find(entry.Id) is null) return;
            if (time.GetUtcNow() - entry.CheckedAt < TimeSpan.FromSeconds(options.CheckIntervalSeconds)) return;
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(options.ProviderTimeoutSeconds));
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var user = await scope.ServiceProvider.GetRequiredService<VantageDbContext>().Users.AsNoTracking()
                    .SingleOrDefaultAsync(x => x.Id == entry.UserId, timeout.Token);
                if (user is not { Enabled: true } || user.AccessRevision != entry.AccessRevision ||
                    user.Issuer != entry.Probe.Issuer || user.Subject != entry.Probe.Subject ||
                    !await provider.IsActiveAsync(entry.Probe, timeout.Token)) { sessions.Terminate(entry.Id); return; }
                sessions.SetDataAccess(entry, user.CanUseData);
                entry.CheckedAt = time.GetUtcNow();
            }
            catch (Exception error)
            {
                // Classification only: exception messages/bodies can carry provider or credential material.
                logger?.LogInformation("Identity session validation failed closed ({FailureType}).", error.GetType().Name);
                sessions.Terminate(entry.Id);
            }
        }));
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1), time);
        try { while (await timer.WaitForNextTickAsync(stoppingToken)) await CheckAsync(stoppingToken); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        finally { foreach (var entry in sessions.Active) sessions.Terminate(entry.Id); }
    }
}
