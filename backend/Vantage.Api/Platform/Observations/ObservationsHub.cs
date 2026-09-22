using System.Security.Claims;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.SignalR;
using Vantage.Api.Contracts;
using Vantage.Api.Platform.Identity;

namespace Vantage.Api.Platform.Observations;

public sealed class ObservationsHub(AircraftCoordinator coordinator, EarthquakeCoordinator earthquakes, PlatformAccess access, ISessionLifetime sessions) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await access.RequireDataAsync(Context.ConnectionAborted);
        var lease = sessions.Acquire(Context.User!.FindFirstValue(SessionClaims.SessionId)!, Context.User!.FindFirstValue(SessionClaims.UserId)!);
        Context.Items["session-lease"] = lease;
        Context.Items["session-abort"] = lease.Cancellation.Register(Context.Abort);
        await base.OnConnectedAsync();
    }
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.Items.Remove("session-abort", out var registration)) ((CancellationTokenRegistration)registration!).Dispose();
        if (Context.Items.Remove("session-lease", out var lease)) ((SessionLease)lease!).Dispose();
        await base.OnDisconnectedAsync(exception);
    }
    private CancellationTokenSource StreamCancellation(CancellationToken ct)
    {
        var lease = (SessionLease)Context.Items["session-lease"]!;
        return CancellationTokenSource.CreateLinkedTokenSource(ct, Context.ConnectionAborted, lease.Cancellation);
    }
    // Reconnection reauthorizes and starts a reset snapshot; sources have no durable resume history.
    public async IAsyncEnumerable<AircraftBatchDto> Aircraft(AircraftQuery query, [EnumeratorCancellation] CancellationToken ct)
    {
        using var linked = StreamCancellation(ct);
        ct = linked.Token;
        await access.RequireDataAsync(ct);
        await foreach (var batch in coordinator.Subscribe(query, ct)) yield return batch;
    }
    public async IAsyncEnumerable<EarthquakeBatchDto> Earthquakes([EnumeratorCancellation] CancellationToken ct)
    {
        using var linked = StreamCancellation(ct);
        ct = linked.Token;
        await access.RequireDataAsync(ct);
        await foreach (var batch in earthquakes.Subscribe(ct)) yield return batch;
    }
}
