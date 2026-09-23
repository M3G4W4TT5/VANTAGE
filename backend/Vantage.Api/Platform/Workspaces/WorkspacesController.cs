using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Connections;
using Vantage.Api.Platform.Preferences;

namespace Vantage.Api.Platform.Workspaces;

[ApiController]
[Route("api/v1/workspaces")]
[Produces("application/json")]
public sealed class WorkspacesController(VantageDbContext db, WorkspaceValidation validation, IEnumerable<IWorkspaceTemplate> templates,
    PlatformAccess access, IEnumerable<IConnectionDemandControl> demandControls,
    IEnumerable<IWorkspaceStateMigrator> stateMigrators) : ControllerBase
{
    [HttpGet(Name = "ListWorkspaces")]
    public async Task<ActionResult<WorkspaceSummaryDto[]>> List(CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        return await db.Workspaces.AsNoTracking().Where(w => w.OwnerId == owner.Id)
            .OrderByDescending(w => w.UpdatedAt).Take(100)
            .Select(w => new WorkspaceSummaryDto(w.Id, w.OwnerId, w.Name, w.Revision, w.UpdatedAt)).ToArrayAsync(ct);
    }

    [HttpPost(Name = "CreateWorkspace")]
    [ProducesResponseType<WorkspaceDto>(201)]
    [ProducesResponseType<ApiError>(400)]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceRequest request, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        if (!WorkspaceValidation.ValidName(request.Name)) return BadRequest(new ApiError("invalid_name", "Use a workspace name of 1–120 characters."));
        if (await db.Workspaces.CountAsync(w => w.OwnerId == owner.Id, ct) >= 100) return BadRequest(new ApiError("workspace_limit", "The prototype supports up to 100 workspaces."));
        var id = Guid.NewGuid().ToString("N");
        var template = templates.FirstOrDefault();
        if (template is null) return Conflict(new ApiError("app_unavailable", "No workspace app is registered. Existing work remains available."));
        var preferences = await db.PersonalPreferences.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == owner.Id, ct);
        var state = template.Create(id, preferences?.DefaultRegion ?? DisplayPreferences.DefaultRegion);
        var row = new WorkspaceRow { Id = id, OwnerId = owner.Id, Name = request.Name.Trim(), Revision = 1,
            StateJson = JsonSerializer.Serialize(state, WorkspaceValidation.Json), CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        db.Workspaces.Add(row);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id }, ToDto(row, state));
    }

    [HttpGet("{id}", Name = "GetWorkspace")]
    [ProducesResponseType<WorkspaceDto>(200)]
    [ProducesResponseType<ApiError>(404)]
    [ProducesResponseType<ApiError>(422)]
    public async Task<ActionResult<WorkspaceDto>> Get(string id, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        var row = await db.Workspaces.AsNoTracking().SingleOrDefaultAsync(w => w.Id == id && w.OwnerId == owner.Id, ct);
        if (row is null) return NotFound(new ApiError("not_found", "Workspace not found."));
        var state = ReadState(row, out var recovery);
        if (state is null) return UnprocessableEntity(new ApiError("invalid_workspace", recovery));
        return ToDto(row, state);
    }

    [HttpPut("{id}", Name = "UpdateWorkspace")]
    [ProducesResponseType<WorkspaceDto>(200)]
    [ProducesResponseType<ApiError>(400)]
    [ProducesResponseType<ApiError>(404)]
    [ProducesResponseType<ApiError>(409)]
    public async Task<ActionResult<WorkspaceDto>> Update(string id, UpdateWorkspaceRequest request, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        if (!WorkspaceValidation.ValidName(request.Name)) return BadRequest(new ApiError("invalid_name", "Use a workspace name of 1–120 characters."));
        var state = new WorkspaceStateDto(request.Panes, request.LinkGroups, request.AppStates);
        var error = validation.Validate(id, request.SchemaVersion, state);
        if (error is not null) return BadRequest(new ApiError("invalid_workspace", error));
        var row = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == id && w.OwnerId == owner.Id, ct);
        if (row is null) return NotFound(new ApiError("not_found", "Workspace not found."));
        if (row.Revision != request.Revision) return Conflict(ConflictError);
        row.Name = request.Name.Trim(); row.Revision++; row.UpdatedAt = DateTimeOffset.UtcNow;
        row.StateJson = JsonSerializer.Serialize(state, WorkspaceValidation.Json);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(ConflictError); }
        return ToDto(row, state);
    }

    [HttpPost("{id}/duplicate", Name = "DuplicateWorkspace")]
    [ProducesResponseType<WorkspaceDto>(201)]
    [ProducesResponseType<ApiError>(400)]
    [ProducesResponseType<ApiError>(404)]
    [ProducesResponseType<ApiError>(409)]
    [ProducesResponseType<ApiError>(422)]
    public async Task<ActionResult<WorkspaceDto>> Duplicate(string id, DuplicateWorkspaceRequest request, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        if (!WorkspaceValidation.ValidName(request.Name)) return BadRequest(new ApiError("invalid_name", "Use a workspace name of 1–120 characters."));
        var source = await db.Workspaces.AsNoTracking().SingleOrDefaultAsync(w => w.Id == id && w.OwnerId == owner.Id, ct);
        if (source is null) return NotFound(new ApiError("not_found", "Workspace not found."));
        if (source.Revision != request.Revision) return Conflict(ConflictError);
        var state = ReadState(source, out var recovery);
        if (state is null) return UnprocessableEntity(new ApiError("invalid_workspace", recovery));
        if (await db.Workspaces.CountAsync(w => w.OwnerId == owner.Id, ct) >= 100) return BadRequest(new ApiError("workspace_limit", "The prototype supports up to 100 workspaces."));
        var newId = Guid.NewGuid().ToString("N");
        foreach (var pane in state.Panes) pane.Context["workspaceId"] = newId;
        var row = new WorkspaceRow { Id = newId, OwnerId = owner.Id, Name = request.Name.Trim(), Revision = 1,
            StateJson = JsonSerializer.Serialize(state, WorkspaceValidation.Json), CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        db.Workspaces.Add(row); await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = newId }, ToDto(row, state));
    }

    [HttpDelete("{id}", Name = "DeleteWorkspace")]
    [ProducesResponseType(204)]
    [ProducesResponseType<ApiError>(404)]
    [ProducesResponseType<ApiError>(409)]
    public async Task<IActionResult> Delete(string id, [FromQuery] long revision, CancellationToken ct)
    {
        var owner = await access.RequireUserAsync(ct);
        var row = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == id && w.OwnerId == owner.Id, ct);
        if (row is null) return NotFound(new ApiError("not_found", "Workspace not found."));
        if (row.Revision != revision) return Conflict(ConflictError);
        var scopedConnections = await db.Connections.AsNoTracking().Where(x => x.OwnerId == owner.Id &&
            x.Scope == "workspace" && x.WorkspaceId == id).Select(x => x.Id).ToArrayAsync(ct);
        db.Workspaces.Remove(row);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(ConflictError); }
        foreach (var connectionId in scopedConnections)
            foreach (var control in demandControls) control.Cancel(connectionId);
        return NoContent();
    }

    private WorkspaceStateDto? ReadState(WorkspaceRow row, out string recovery)
    {
        recovery = "Stored workspace state is invalid or unsupported. Its original JSON remains in the database for repair or protected-backup recovery.";
        try
        {
            var state = JsonSerializer.Deserialize<WorkspaceStateDto>(row.StateJson, WorkspaceValidation.Json);
            if (state is null) return null;
            var migrator = stateMigrators.FirstOrDefault(item => item.AppliesTo(state));
            var error = validation.Validate(row.Id, row.SchemaVersion, state, allowLegacyAtlas: migrator is not null);
            if (error is not null) { recovery = $"{error} The original JSON remains in the database for repair or protected-backup recovery."; return null; }
            if (migrator is null) return state;
            var migrated = migrator.Migrate(state);
            error = validation.Validate(row.Id, row.SchemaVersion, migrated);
            if (error is not null) { recovery = $"ATLAS v1 conversion failed: {error} The original JSON remains in the database for repair or protected-backup recovery."; return null; }
            return migrated;
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException or ArgumentException)
        {
            recovery = "Stored workspace JSON could not be read or converted. The original remains in the database for repair or protected-backup recovery.";
            return null;
        }
    }
    private static ApiError ConflictError => new("revision_conflict", "This workspace changed elsewhere. Reload it before saving again.");
    private static WorkspaceDto ToDto(WorkspaceRow row, WorkspaceStateDto state) => new(row.Id, row.OwnerId, row.Name, row.Revision,
        row.SchemaVersion, state.Panes, state.LinkGroups, state.AppStates, row.CreatedAt, row.UpdatedAt);
}
