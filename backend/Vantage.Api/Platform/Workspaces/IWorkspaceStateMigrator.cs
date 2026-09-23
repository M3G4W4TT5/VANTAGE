using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Workspaces;

public interface IWorkspaceStateMigrator
{
    bool AppliesTo(WorkspaceStateDto state);
    WorkspaceStateDto Migrate(WorkspaceStateDto state);
}
