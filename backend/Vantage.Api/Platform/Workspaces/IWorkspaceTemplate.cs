using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Workspaces;

public interface IWorkspaceTemplate
{
    WorkspaceStateDto Create(string workspaceId, string defaultRegion = "northern-europe");
}
