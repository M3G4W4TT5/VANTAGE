namespace Vantage.Api.Contracts;

public sealed record PaneDto(string Id, string AppId, int StateSchemaVersion,
    Dictionary<string, object?> State, Dictionary<string, object?> Context);
public sealed record LinkGroupDto(string Id, string[] PaneIds, string[] Fields);
public sealed record WorkspaceStateDto(PaneDto[] Panes, LinkGroupDto[] LinkGroups, Dictionary<string, object?> AppStates);
public sealed record WorkspaceDto(string Id, string OwnerId, string Name, long Revision, int SchemaVersion,
    PaneDto[] Panes, LinkGroupDto[] LinkGroups, Dictionary<string, object?> AppStates,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record WorkspaceSummaryDto(string Id, string OwnerId, string Name, long Revision, DateTimeOffset UpdatedAt);
public sealed record CreateWorkspaceRequest(string Name);
public sealed record UpdateWorkspaceRequest(string Name, long Revision, int SchemaVersion,
    PaneDto[] Panes, LinkGroupDto[] LinkGroups, Dictionary<string, object?> AppStates);
public sealed record DuplicateWorkspaceRequest(string Name, long Revision);
public sealed record ApiError(string Code, string Message, bool Retryable = false);
public sealed record HealthDto(string Status, string Storage, int ContractVersion);
public sealed record PersonalPreferencesDto(int SchemaVersion, string Theme, long Revision, DateTimeOffset? UpdatedAt);
public sealed record UpdatePersonalPreferencesRequest(string Theme, long Revision);
