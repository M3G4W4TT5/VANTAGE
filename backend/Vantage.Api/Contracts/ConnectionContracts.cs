using System.Text.Json;

namespace Vantage.Api.Contracts;

public sealed record ConnectorTypeDto(string Id, int Version, string Name, string Domain, string[] Capabilities,
    string[] AuthenticationModes, string SettingsSchemaUrl, string Coverage, string Attribution, int PollSeconds,
    int ResultLimit, string SourceId);
public sealed record ConnectionTemplateDto(string Id, int Version, string ConnectorTypeId, string Name,
    int SchemaVersion, JsonElement Settings);
public sealed record DatasetDto(string Id, string ConnectionId, string ProductId, string SourceId, string Domain,
    string[] Capabilities, string Coverage, string Attribution, string[] AllowedOperations, int PollSeconds,
    int StaleAfterSeconds, string Availability);
public sealed record ConnectionDto(string Id, string Name, string ConnectorTypeId, string? TemplateId, int? TemplateVersion,
    int SchemaVersion, string Scope, string? WorkspaceId, bool Enabled, long Revision, JsonElement Settings,
    bool HasCredential, string Status, DatasetDto[] Datasets, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    DateTimeOffset? RemovedAt);
public sealed record CreateConnectionRequest(string Name, string ConnectorTypeId, string? TemplateId,
    int SchemaVersion, JsonElement Settings, string Scope = "global", string? WorkspaceId = null, bool Enabled = true);
public sealed record UpdateConnectionRequest(string Name, long Revision, int SchemaVersion, JsonElement Settings,
    string Scope, string? WorkspaceId, bool Enabled);
public sealed record DuplicateConnectionRequest(string Name, long Revision);
public sealed record ConnectionTestRequest(long Revision, int SchemaVersion, JsonElement Settings);
public sealed record ConnectionPreviewRequest(string ConnectorTypeId, int SchemaVersion, JsonElement Settings);
public sealed record ConnectionPreviewRowDto(string Id, string Label, DateTimeOffset? SourceTime,
    DateTimeOffset RetrievedAt, double? Longitude, double? Latitude);
public sealed record ConnectionTestDto(bool Valid, string State, string Message, string[] Problems,
    int? PreviewCount, DateTimeOffset? TestedAt, ConnectionPreviewRowDto[] PreviewRows);
public sealed record ConnectionStatusDto(string ConnectionId, string HealthState, string HealthMessage,
    int ActiveOperations, int ActiveConsumers, bool ProviderAvailable, DateTimeOffset? CachedRetrievedAt,
    int CachedRecords, DateTimeOffset AsOf);
public sealed record ConnectionCredentialRequest(long Revision, string Value);
public sealed record ConnectionExportDto(int SchemaVersion, string ConnectorTypeId, string Name, string Scope,
    string? WorkspaceId, bool Enabled, JsonElement Settings, bool RequiresCredential);
public sealed record ConnectionImportRequest(int SchemaVersion, ConnectionExportDto[] Connections);
public sealed record ConnectionImportResultDto(ConnectionDto[] Connections, int Rejected, string[] Problems);
public sealed record ConnectionImpactDto(string ConnectionId, long Revision, string[] WorkspaceIds,
    string Effect);
