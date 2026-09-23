using Vantage.Api.Contracts;
using Vantage.Api.Platform.Workspaces;
using Vantage.Api.Platform.Preferences;

namespace Vantage.Api.Atlas;

public sealed class AtlasWorkspaceTemplate : IWorkspaceTemplate
{
    public WorkspaceStateDto Create(string workspaceId, string defaultRegion = DisplayPreferences.DefaultRegion)
    {
        const string paneId = "atlas-1";
        var camera = DisplayPreferences.Regions.TryGetValue(defaultRegion, out var position) ? position :
            DisplayPreferences.Regions[DisplayPreferences.DefaultRegion];
        var state = new Dictionary<string, object?>
        {
            ["schemaVersion"] = 2, ["viewMode"] = "canvas", ["resultsOpen"] = false,
            ["sidebarOpen"] = true, ["inspectorOpen"] = true, ["sidebarWidth"] = 280,
            ["inspectorWidth"] = 360, ["sort"] = "label", ["expandedDetails"] = false,
            ["mapMode"] = "2d", ["camera"] = new { longitude = camera.Longitude, latitude = camera.Latitude, height = camera.Height },
            ["focusedLayerId"] = "aircraft-1", ["selectedLayerId"] = null, ["resultScope"] = "focused",
            ["layers"] = new object[]
            {
                new { id = "aircraft-1", domain = "aircraft", connectionId = "legacy-aircraft", datasetId = "legacy-aircraft:positions",
                    visible = true, participating = true, appearance = new { opacity = 1, sizeScale = 1 },
                    query = new AircraftQuery(), filters = new { query = "", freshness = "all" } },
                new { id = "earthquakes-1", domain = "earthquakes", connectionId = "legacy-earthquakes", datasetId = "legacy-earthquakes:events",
                    visible = false, participating = false, appearance = new { opacity = 1, sizeScale = 1 },
                    filters = new { query = "", minimumMagnitude = (double?)null, maxAgeHours = (int?)null, sort = "occurred" } }
            }
        };
        var context = new Dictionary<string, object?>
        {
            ["schemaVersion"] = 1, ["workspaceId"] = workspaceId, ["paneId"] = paneId,
            ["selection"] = new { entityIds = Array.Empty<string>(), observationIds = Array.Empty<string>() },
            ["area"] = null, ["time"] = new { mode = "live", cursor = (string?)null, from = (string?)null, to = (string?)null },
            ["layerIds"] = new[] { "aircraft-1" },
            ["filters"] = new { }, ["linkGroupId"] = null
        };
        return new([new(paneId, "atlas", 2, state, context)], [],
            new() { ["shell"] = new { theme = "dark", activePaneId = paneId } });
    }
}
