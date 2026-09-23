using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Vantage.Api.Contracts;
using Vantage.Api.Persistence;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Observations;

namespace Vantage.Api.Platform.Connections;

[ApiController, Route("api/v1/connections"), Produces("application/json")]
public sealed class ConnectionsController(VantageDbContext db, PlatformAccess access, ConnectorRegistry registry,
    ConnectionSecretStore secrets, ProviderRequestBudget budget, IEnumerable<IConnectionDemandControl> demandControls,
    AircraftSources aircraft, EarthquakeSources earthquakes, AircraftCoordinator aircraftCoordinator,
    EarthquakeCoordinator earthquakeCoordinator) : ControllerBase
{
    [HttpGet("connector-types", Name = "ListConnectorTypes")]
    public async Task<ActionResult<ConnectorTypeDto[]>> Types(CancellationToken ct)
    { await access.RequireDataAsync(ct); return registry.Types; }

    [HttpGet("connector-types/{typeId}/settings-schema", Name = "GetConnectorSettingsSchema")]
    public async Task<IActionResult> SettingsSchema(string typeId, CancellationToken ct)
    {
        await access.RequireDataAsync(ct);
        if (registry.Find(typeId) is null) return NotFound(new ApiError("not_found", "Connector type not found."));
        var path = Path.Combine(AppContext.BaseDirectory, "Schemas", typeId + "-settings.schema.json");
        return Content(await System.IO.File.ReadAllTextAsync(path, ct), "application/schema+json");
    }

    [HttpGet("templates", Name = "ListConnectionTemplates")]
    public async Task<ActionResult<ConnectionTemplateDto[]>> Templates(CancellationToken ct)
    { await access.RequireDataAsync(ct); return registry.Templates; }

    [HttpGet(Name = "ListConnections")]
    public async Task<ActionResult<ConnectionDto[]>> List(CancellationToken ct)
    {
        var owner = await Owner(ct);
        var rows = await db.Connections.AsNoTracking().Where(x => x.OwnerId == owner)
            .OrderBy(x => x.Name).Take(100).ToArrayAsync(ct);
        return await ToDtos(rows, ct);
    }

    [HttpGet("{id}", Name = "GetConnection")]
    public async Task<ActionResult<ConnectionDto>> Get(string id, CancellationToken ct)
    {
        var row = await Owned(id, ct);
        return await ToDto(row, ct);
    }

    // Reads local runtime and cache state only. Viewing NEXUS never creates provider demand.
    [HttpGet("{id}/status", Name = "GetConnectionStatus")]
    public async Task<ActionResult<ConnectionStatusDto>> Status(string id, CancellationToken ct)
    {
        var row = await Owned(id, ct);
        var aircraftType = row.ConnectorTypeId == "adsb-lol";
        var providerAvailable = aircraftType ? aircraft.Active.Enabled : earthquakes.Active.Enabled;
        var demand = aircraftType ? aircraftCoordinator.Snapshot(id) : earthquakeCoordinator.Snapshot(id);
        DateTimeOffset? cachedAt;
        int cachedRecords;
        if (aircraftType)
        {
            var cached = db.CurrentAircraft.AsNoTracking().Where(x => x.ConnectionId == id);
            cachedAt = await cached.Select(x => (DateTimeOffset?)x.RetrievedAt).MaxAsync(ct);
            cachedRecords = await cached.CountAsync(ct);
        }
        else
        {
            cachedAt = await db.EarthquakeFeeds.AsNoTracking().Where(x => x.ConnectionId == id)
                .Select(x => (DateTimeOffset?)x.RetrievedAt).MaxAsync(ct);
            cachedRecords = await db.CurrentEarthquakes.AsNoTracking().CountAsync(x => x.ConnectionId == id && x.InLatestFeed, ct);
        }
        var state = row.RemovedAt is not null ? "removed" : !row.Enabled ? "disabled" :
            row.CredentialRef is not null ? "setup_required" : !providerAvailable ? "unavailable" :
            demand.HealthState ?? "not_checked";
        var message = state switch
        {
            "removed" => "Connection removed; retained cache and evidence are not erased.",
            "disabled" => "Connection disabled; no new collection is allowed.",
            "setup_required" => "A credential must be configured before collection is available.",
            "unavailable" => "The installed provider is unavailable.",
            "not_checked" => "No active demand. Provider health has not been checked by this view.",
            _ => demand.HealthMessage ?? "Provider status is unavailable."
        };
        return new ConnectionStatusDto(id, state, message, demand.Operations, demand.Consumers,
            providerAvailable, cachedAt, cachedRecords, DateTimeOffset.UtcNow);
    }

    [HttpGet("{id}/impact", Name = "GetConnectionImpact")]
    public async Task<ActionResult<ConnectionImpactDto>> Impact(string id, CancellationToken ct)
    {
        var row = await Owned(id, ct);
        var ids = row.Scope == "workspace" ? new[] { row.WorkspaceId! } :
            await db.Workspaces.AsNoTracking().Where(x => x.OwnerId == row.OwnerId).Select(x => x.Id).ToArrayAsync(ct);
        return new ConnectionImpactDto(row.Id, row.Revision, ids,
            "Editing or disabling ends current demand for this connection; removing preserves references and retained evidence.");
    }

    [HttpPost(Name = "CreateConnection")]
    [ProducesResponseType<ConnectionDto>(201)]
    [ProducesResponseType<ApiError>(400)]
    public async Task<ActionResult<ConnectionDto>> Create(CreateConnectionRequest request, CancellationToken ct)
    {
        var owner = await Owner(ct);
        var problem = await Validate(request.Name, request.ConnectorTypeId, request.SchemaVersion,
            request.Settings, request.Scope, request.WorkspaceId, owner, ct);
        if (problem is not null) return BadRequest(problem);
        if (request.Settings.GetProperty("pollSeconds").GetInt32() != registry.DefaultPollSeconds(request.ConnectorTypeId))
            return BadRequest(new ApiError("polling_controls_deferred", "New connections use the connector's bounded default cadence."));
        if (request.TemplateId is { } templateId)
        {
            var template = registry.Template(templateId);
            if (template is null || template.ConnectorTypeId != request.ConnectorTypeId)
                return BadRequest(new ApiError("invalid_template", "The template does not match this connector."));
        }
        if (await db.Connections.CountAsync(x => x.OwnerId == owner && x.RemovedAt == null, ct) >= 100)
            return BadRequest(new ApiError("connection_limit", "The prototype supports up to 100 active connections."));
        var now = DateTimeOffset.UtcNow;
        var row = new ConnectionRow { Id = Guid.NewGuid().ToString("N"), OwnerId = owner, Name = request.Name.Trim(),
            ConnectorTypeId = request.ConnectorTypeId, TemplateId = request.TemplateId,
            TemplateVersion = request.TemplateId is null ? null : registry.Template(request.TemplateId)!.Version,
            SchemaVersion = request.SchemaVersion, SettingsJson = request.Settings.GetRawText(), Scope = request.Scope,
            WorkspaceId = request.WorkspaceId, Enabled = request.Enabled, CreatedAt = now, UpdatedAt = now };
        db.Connections.Add(row); db.Datasets.Add(registry.NewDataset(row.Id, row.ConnectorTypeId));
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = row.Id }, await ToDto(row, ct));
    }

    [HttpPut("{id}", Name = "UpdateConnection")]
    public async Task<ActionResult<ConnectionDto>> Update(string id, UpdateConnectionRequest request, CancellationToken ct)
    {
        var row = await OwnedForEdit(id, ct);
        if (row.RemovedAt is not null) return Conflict(new ApiError("removed", "Removed connections cannot be edited."));
        if (row.Revision != request.Revision) return Conflict(RevisionConflict);
        var problem = await Validate(request.Name, row.ConnectorTypeId, request.SchemaVersion,
            request.Settings, request.Scope, request.WorkspaceId, row.OwnerId, ct);
        if (problem is not null) return BadRequest(problem);
        if (request.Settings.GetProperty("pollSeconds").GetInt32() != registry.PollSeconds(row.ConnectorTypeId, row.SettingsJson))
            return BadRequest(new ApiError("polling_controls_deferred", "Polling cadence is not an editable connection control in this prototype."));
        row.Name = request.Name.Trim(); row.SettingsJson = request.Settings.GetRawText();
        row.Scope = request.Scope; row.WorkspaceId = request.WorkspaceId;
        row.Enabled = request.Enabled; row.SchemaVersion = request.SchemaVersion;
        row.Revision++; row.UpdatedAt = DateTimeOffset.UtcNow;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(RevisionConflict); }
        Cancel(id);
        return await ToDto(row, ct);
    }

    [HttpPost("{id}/duplicate", Name = "DuplicateConnection")]
    [ProducesResponseType<ConnectionDto>(201)]
    [ProducesResponseType<ApiError>(400)]
    [ProducesResponseType<ApiError>(404)]
    [ProducesResponseType<ApiError>(409)]
    public async Task<ActionResult<ConnectionDto>> Duplicate(string id, DuplicateConnectionRequest request, CancellationToken ct)
    {
        var original = await Owned(id, ct);
        if (original.RemovedAt is not null) return Conflict(new ApiError("removed", "Removed connections cannot be duplicated."));
        if (original.Revision != request.Revision) return Conflict(RevisionConflict);
        using var copySettings = JsonDocument.Parse(original.SettingsJson);
        var problem = await Validate(request.Name, original.ConnectorTypeId, original.SchemaVersion,
            copySettings.RootElement, original.Scope, original.WorkspaceId, original.OwnerId, ct);
        if (problem is not null) return BadRequest(problem);
        if (await db.Connections.CountAsync(x => x.OwnerId == original.OwnerId && x.RemovedAt == null, ct) >= 100)
            return BadRequest(new ApiError("connection_limit", "The prototype supports up to 100 active connections."));
        var now = DateTimeOffset.UtcNow;
        var copy = new ConnectionRow { Id = Guid.NewGuid().ToString("N"), OwnerId = original.OwnerId, Name = request.Name.Trim(),
            ConnectorTypeId = original.ConnectorTypeId, TemplateId = original.TemplateId, TemplateVersion = original.TemplateVersion,
            SchemaVersion = original.SchemaVersion, SettingsJson = original.SettingsJson, Scope = original.Scope,
            WorkspaceId = original.WorkspaceId, Enabled = original.Enabled, CreatedAt = now, UpdatedAt = now,
            CredentialRef = original.CredentialRef is null ? null : "unresolved:" + Guid.NewGuid().ToString("N") };
        db.Connections.Add(copy); db.Datasets.Add(registry.NewDataset(copy.Id, copy.ConnectorTypeId));
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = copy.Id }, await ToDto(copy, ct));
    }

    [HttpDelete("{id}", Name = "RemoveConnection")]
    public async Task<IActionResult> Remove(string id, [FromQuery] long revision, CancellationToken ct)
    {
        var row = await OwnedForEdit(id, ct);
        if (row.Revision != revision) return Conflict(RevisionConflict);
        if (row.RemovedAt is not null) return NoContent();
        row.Enabled = false; row.RemovedAt = DateTimeOffset.UtcNow; row.Revision++; row.UpdatedAt = row.RemovedAt.Value;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(RevisionConflict); }
        Cancel(id);
        return NoContent();
    }

    [HttpGet("{id}/datasets", Name = "ListConnectionDatasets")]
    public async Task<ActionResult<DatasetDto[]>> Datasets(string id, CancellationToken ct)
    {
        var row = await Owned(id, ct);
        var datasets = await db.Datasets.AsNoTracking().Where(x => x.ConnectionId == id).ToArrayAsync(ct);
        return datasets.Select(x => registry.Dataset(row, x)).ToArray();
    }

    // Explicit, side-effect-free provider preview. No Save or collection occurs on a successful test.
    [HttpPost("preview", Name = "PreviewConnectionDraft")]
    public async Task<ActionResult<ConnectionTestDto>> Preview(ConnectionPreviewRequest request, CancellationToken ct)
    {
        await Owner(ct);
        var problems = registry.Validate(request.ConnectorTypeId, request.SchemaVersion, request.Settings);
        if (problems.Length > 0) return BadRequest(new ConnectionTestDto(false, "invalid", "Settings failed validation.", problems, null, null, []));
        if (request.Settings.GetProperty("pollSeconds").GetInt32() != registry.DefaultPollSeconds(request.ConnectorTypeId))
            return BadRequest(new ConnectionTestDto(false, "invalid", "New connections use the provider's bounded default cadence.", [], null, null, []));
        return await PreviewProvider(request.ConnectorTypeId, ct);
    }

    [HttpPost("{id}/test", Name = "TestConnection")]
    public async Task<ActionResult<ConnectionTestDto>> Test(string id, ConnectionTestRequest request, CancellationToken ct)
    {
        var row = await Owned(id, ct);
        if (row.Revision != request.Revision) return Conflict(RevisionConflict);
        var problems = registry.Validate(row.ConnectorTypeId, request.SchemaVersion, request.Settings);
        if (problems.Length > 0) return BadRequest(new ConnectionTestDto(false, "invalid", "Settings failed validation.", problems, null, null, []));
        if (request.Settings.GetProperty("pollSeconds").GetInt32() != registry.PollSeconds(row.ConnectorTypeId, row.SettingsJson))
            return BadRequest(new ConnectionTestDto(false, "invalid", "Polling cadence is not editable in this prototype.", [], null, null, []));
        if (row.RemovedAt is not null || !row.Enabled || row.CredentialRef is not null)
            return new ConnectionTestDto(false, row.RemovedAt is not null ? "removed" : !row.Enabled ? "disabled" : "setup_required",
                "The connection is unavailable for testing.", [], null, null, []);
        return await PreviewProvider(row.ConnectorTypeId, ct);
    }

    private async Task<ConnectionTestDto> PreviewProvider(string connectorTypeId, CancellationToken ct)
    {
        if (connectorTypeId == "adsb-lol" ? !aircraft.Active.Enabled : !earthquakes.Active.Enabled)
            return new ConnectionTestDto(false, "unavailable", "The installed provider is unavailable.", [], null, null, []);
        if (budget.Reserve(connectorTypeId, TimeSpan.FromSeconds(connectorTypeId == "adsb-lol" ? 8 : 30)) is { } ready)
            return new ConnectionTestDto(false, "rate_limited", $"The provider request budget is reserved until {ready:O}.",
                [], null, DateTimeOffset.UtcNow, []);
        try
        {
            if (connectorTypeId == "adsb-lol")
            {
                var fetch = await aircraft.Active.FetchAsync(new AircraftQuery(), ct);
                return new ConnectionTestDto(true, fetch.Rejected > 0 || fetch.Truncated ? "degraded" : "healthy",
                    "A bounded aircraft response was parsed; no observations were saved.",
                    [], fetch.Records.Length, DateTimeOffset.UtcNow,
                    fetch.Records.Take(3).Select(x => new ConnectionPreviewRowDto(x.Record.Entity.Id, x.Record.Entity.Label,
                        x.Record.Observation.ObservedAt, x.Record.Observation.RetrievedAt,
                        x.Record.Observation.Geometry?.Coordinates[0], x.Record.Observation.Geometry?.Coordinates[1])).ToArray());
            }
            var quakes = await earthquakes.Active.FetchAsync(ct);
            return new ConnectionTestDto(true, quakes.Rejected > 0 || quakes.Truncated ? "degraded" : "healthy",
                "A bounded earthquake feed was parsed; no observations were saved.", [], quakes.Records.Length, DateTimeOffset.UtcNow,
                quakes.Records.Take(3).Select(x => new ConnectionPreviewRowDto(x.Record.Entity.Id, x.Record.Entity.Label,
                    x.Record.Observation.ObservedAt, x.Record.Observation.RetrievedAt,
                    x.Record.Observation.Geometry?.Coordinates[0], x.Record.Observation.Geometry?.Coordinates[1])).ToArray());
        }
        catch (SourceException e) { return new ConnectionTestDto(false, e.State, e.Message, [], null, DateTimeOffset.UtcNow, []); }
        catch (Exception) when (!ct.IsCancellationRequested)
        { return new ConnectionTestDto(false, "offline", "The source could not be tested; no configuration was changed.", [], null, DateTimeOffset.UtcNow, []); }
    }

    [HttpGet("export", Name = "ExportConnections")]
    public async Task<ActionResult<ConnectionImportRequest>> Export(CancellationToken ct)
    {
        var owner = await Owner(ct);
        var rows = await db.Connections.AsNoTracking().Where(x => x.OwnerId == owner && x.RemovedAt == null)
            .OrderBy(x => x.Name).Take(100).ToArrayAsync(ct);
        return new ConnectionImportRequest(1, rows.Select(x => new ConnectionExportDto(1, x.ConnectorTypeId, x.Name,
            x.Scope, x.WorkspaceId, x.Enabled, JsonDocument.Parse(x.SettingsJson).RootElement.Clone(),
            x.CredentialRef is not null)).ToArray());
    }

    [HttpPost("import", Name = "ImportConnections")]
    public async Task<ActionResult<ConnectionImportResultDto>> Import(JsonElement document, CancellationToken ct)
    {
        var owner = await Owner(ct);
        var syntax = registry.ValidateExport(document);
        if (syntax.Length > 0) return BadRequest(new ConnectionImportResultDto([], 0, syntax));
        var request = JsonSerializer.Deserialize<ConnectionImportRequest>(document.GetRawText(),
            new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        if (request.SchemaVersion != 1 || request.Connections is null || request.Connections.Length is < 1 or > 100)
            return BadRequest(new ApiError("invalid_import", "Use a version-1 definition with 1–100 connections."));
        if (await db.Connections.CountAsync(x => x.OwnerId == owner && x.RemovedAt == null, ct) + request.Connections.Length > 100)
            return BadRequest(new ApiError("connection_limit", "The prototype supports up to 100 active connections."));
        var problems = new List<string>();
        foreach (var (definition, index) in request.Connections.Select((x, i) => (x, i)))
        {
            if (definition.SchemaVersion != 1) { problems.Add($"Connection {index + 1}: unsupported schema version."); continue; }
            var issue = await Validate(definition.Name, definition.ConnectorTypeId, definition.SchemaVersion,
                definition.Settings, definition.Scope, definition.WorkspaceId, owner, ct);
            if (issue is not null) problems.Add($"Connection {index + 1}: {issue.Message}");
        }
        if (problems.Count > 0) return BadRequest(new ConnectionImportResultDto([], request.Connections.Length, problems.ToArray()));
        var now = DateTimeOffset.UtcNow; var rows = new List<ConnectionRow>();
        foreach (var definition in request.Connections)
        {
            var row = new ConnectionRow { Id = Guid.NewGuid().ToString("N"), OwnerId = owner, Name = definition.Name.Trim(),
                ConnectorTypeId = definition.ConnectorTypeId, SchemaVersion = 1, Scope = definition.Scope,
                WorkspaceId = definition.WorkspaceId, Enabled = definition.Enabled,
                SettingsJson = definition.Settings.GetRawText(),
                CredentialRef = definition.RequiresCredential ? "unresolved:" + Guid.NewGuid().ToString("N") : null,
                CreatedAt = now, UpdatedAt = now };
            rows.Add(row); db.Connections.Add(row); db.Datasets.Add(registry.NewDataset(row.Id, row.ConnectorTypeId));
        }
        await db.SaveChangesAsync(ct);
        return new ConnectionImportResultDto(await ToDtos(rows.ToArray(), ct), 0, []);
    }

    [HttpPut("{id}/credential", Name = "SetConnectionCredential")]
    public async Task<ActionResult<ConnectionDto>> Credential(string id, ConnectionCredentialRequest request, CancellationToken ct)
    {
        var row = await OwnedForEdit(id, ct);
        if (row.Revision != request.Revision) return Conflict(RevisionConflict);
        if (row.RemovedAt is not null) return Conflict(new ApiError("removed", "Removed connections cannot receive credentials."));
        if (registry.Find(row.ConnectorTypeId)?.AuthenticationModes is not { } modes || !modes.Contains("bearer"))
            return BadRequest(new ApiError("unsupported_credential", "This connector does not use a credential."));
        if (request.Value is null || request.Value.Length is < 1 or > 4096)
            return BadRequest(new ApiError("invalid_credential", "The credential must contain 1–4096 characters."));
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        row.CredentialRef = await secrets.SetAsync(row, request.Value, ct);
        row.Revision++; row.UpdatedAt = DateTimeOffset.UtcNow;
        try { await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Conflict(RevisionConflict); }
        Cancel(id);
        return await ToDto(row, ct);
    }

    private async Task<string> Owner(CancellationToken ct)
    {
        var user = await access.RequireUserAsync(ct);
        if (!user.CanUseData) throw new PlatformAccessException(403);
        return user.Id;
    }
    private async Task<ConnectionRow> Owned(string id, CancellationToken ct)
    {
        var owner = await Owner(ct);
        return await db.Connections.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.OwnerId == owner, ct)
            ?? throw new PlatformAccessException(404);
    }
    private async Task<ConnectionRow> OwnedForEdit(string id, CancellationToken ct)
    {
        var owner = await Owner(ct);
        return await db.Connections.SingleOrDefaultAsync(x => x.Id == id && x.OwnerId == owner, ct)
            ?? throw new PlatformAccessException(404);
    }
    private async Task<ApiError?> Validate(string name, string type, int version, JsonElement settings,
        string scope, string? workspaceId, string owner, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
            return new("invalid_name", "Use a connection name of 1–120 characters.");
        var problems = registry.Validate(type, version, settings);
        if (problems.Length > 0) return new("invalid_settings", string.Join(" ", problems));
        if (scope == "global" && workspaceId is null) return null;
        if (scope == "workspace" && workspaceId is { Length: > 0 } &&
            await db.Workspaces.AnyAsync(x => x.Id == workspaceId && x.OwnerId == owner, ct)) return null;
        return new("invalid_scope", "Choose global availability or an owned workspace.");
    }
    private async Task<ConnectionDto[]> ToDtos(ConnectionRow[] rows, CancellationToken ct)
    {
        var ids = rows.Select(x => x.Id).ToArray();
        var datasets = await db.Datasets.AsNoTracking().Where(x => ids.Contains(x.ConnectionId)).ToArrayAsync(ct);
        return rows.Select(x => ToDto(x, datasets.Where(d => d.ConnectionId == x.Id).ToArray())).ToArray();
    }
    private async Task<ConnectionDto> ToDto(ConnectionRow row, CancellationToken ct) =>
        ToDto(row, await db.Datasets.AsNoTracking().Where(x => x.ConnectionId == row.Id).ToArrayAsync(ct));
    private ConnectionDto ToDto(ConnectionRow row, DatasetRow[] datasets) =>
        new(row.Id, row.Name, row.ConnectorTypeId, row.TemplateId, row.TemplateVersion, row.SchemaVersion,
            row.Scope, row.WorkspaceId, row.Enabled, row.Revision, JsonDocument.Parse(row.SettingsJson).RootElement.Clone(),
            row.CredentialRef is not null, row.RemovedAt is not null ? "removed" : !row.Enabled ? "disabled" :
                row.CredentialRef is not null ? "setup_required" : "available",
            datasets.Select(x => registry.Dataset(row, x)).ToArray(), row.CreatedAt, row.UpdatedAt, row.RemovedAt);
    private void Cancel(string id) { foreach (var control in demandControls) control.Cancel(id); }
    private static ApiError RevisionConflict => new("revision_conflict", "Connection changed elsewhere. Reload before saving.");
}
