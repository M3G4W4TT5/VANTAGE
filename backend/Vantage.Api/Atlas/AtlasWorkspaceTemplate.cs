using Vantage.Api.Contracts;
using Vantage.Api.Platform.Workspaces;

namespace Vantage.Api.Atlas;

public sealed class AtlasWorkspaceTemplate : IWorkspaceTemplate
{
    public WorkspaceStateDto Create(string workspaceId)
    {
        const string paneId = "atlas-1";
        var state = new Dictionary<string, object?>
        {
            ["schemaVersion"] = 1, ["viewMode"] = "canvas", ["resultsOpen"] = false,
            ["sidebarOpen"] = true, ["inspectorOpen"] = true, ["sidebarWidth"] = 280,
            ["inspectorWidth"] = 360, ["sort"] = "label", ["expandedDetails"] = false
        };
        var context = new Dictionary<string, object?>
        {
            ["schemaVersion"] = 1, ["workspaceId"] = workspaceId, ["paneId"] = paneId,
            ["selection"] = new { entityIds = Array.Empty<string>(), observationIds = Array.Empty<string>() },
            ["area"] = null, ["time"] = new { mode = "live", cursor = (string?)null, from = (string?)null, to = (string?)null },
            ["layerIds"] = new[] { "demo-aircraft", "demo-vessels", "demo-places" },
            ["filters"] = new { query = "", kind = "all" }, ["linkGroupId"] = null
        };
        return new([new(paneId, "atlas", 1, state, context)], [],
            new() { ["shell"] = new { theme = "dark", activePaneId = paneId } });
    }
}
