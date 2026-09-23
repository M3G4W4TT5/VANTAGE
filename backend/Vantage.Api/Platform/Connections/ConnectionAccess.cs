using Microsoft.EntityFrameworkCore;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;

namespace Vantage.Api.Platform.Connections;

public sealed class ConnectionAccess(VantageDbContext db, PlatformAccess access, ConnectorRegistry registry)
{
    public async Task<ConnectionRow> RequireAsync(string id, string? workspaceId, CancellationToken ct)
    {
        var user = await access.RequireUserAsync(ct);
        if (!user.CanUseData) throw new PlatformAccessException(403);
        var row = await db.Connections.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.OwnerId == user.Id, ct);
        if (row is null) throw new PlatformAccessException(404);
        if (row.Scope == "workspace" && (workspaceId != row.WorkspaceId ||
            !await db.Workspaces.AnyAsync(x => x.Id == workspaceId && x.OwnerId == user.Id, ct)))
            throw new PlatformAccessException(403);
        return row;
    }
    public async Task<ConnectionRow> RequireActiveAsync(string id, string? workspaceId, CancellationToken ct)
    {
        var row = await RequireAsync(id, workspaceId, ct);
        var credentialReady = registry.CredentialReady(row) && (row.ConnectorTypeId != "http-geojson" ||
            row.CredentialRef is null || await db.ConnectionSecrets.AsNoTracking().AnyAsync(x => x.Id == row.CredentialRef && x.ConnectionId == row.Id, ct));
        if (row.RemovedAt is not null || !row.Enabled || !credentialReady)
            throw new ConnectionUnavailableException(row.RemovedAt is not null ? "removed" : !row.Enabled ? "disabled" : "setup_required");
        return row;
    }
    public async Task RequireEvidenceAsync(string observationId, string? workspaceId, CancellationToken ct)
    {
        var user = await access.RequireUserAsync(ct);
        if (!user.CanUseData) throw new PlatformAccessException(403);
        var allowed = await (from delivery in db.ObservationDeliveries.AsNoTracking()
            join connection in db.Connections.AsNoTracking() on delivery.ConnectionId equals connection.Id
            where delivery.ObservationId == observationId && connection.OwnerId == user.Id &&
                (connection.Scope == "global" || (connection.WorkspaceId == workspaceId &&
                    db.Workspaces.Any(x => x.Id == workspaceId && x.OwnerId == user.Id)))
            select delivery.ObservationId).AnyAsync(ct);
        if (!allowed) throw new PlatformAccessException(404);
    }
}

public sealed class ConnectionUnavailableException(string state) : Exception("Connection unavailable.")
{
    public string State { get; } = state;
}

public interface IConnectionDemandControl
{
    void Cancel(string connectionId);
}
