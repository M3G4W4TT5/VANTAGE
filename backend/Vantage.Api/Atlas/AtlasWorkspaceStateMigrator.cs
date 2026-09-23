using System.Text.Json;
using System.Text.Json.Nodes;
using Vantage.Api.Contracts;
using Vantage.Api.Platform.Workspaces;

namespace Vantage.Api.Atlas;

// A read-time conversion. The database keeps the exact v1 JSON until the user explicitly saves.
public sealed class AtlasWorkspaceStateMigrator : IWorkspaceStateMigrator
{
    public bool AppliesTo(WorkspaceStateDto state) => state.Panes.Any(p => p.AppId == "atlas" && p.StateSchemaVersion == 1);

    public WorkspaceStateDto Migrate(WorkspaceStateDto state)
    {
        var root = JsonSerializer.SerializeToNode(state, WorkspaceValidation.Json)!.AsObject();
        foreach (var paneValue in root["panes"]!.AsArray())
        {
            var pane = paneValue!.AsObject();
            if (pane["appId"]!.GetValue<string>() != "atlas" || pane["stateSchemaVersion"]!.GetValue<int>() != 1) continue;
            var old = pane["state"]!.AsObject();
            var context = pane["context"]!.AsObject();
            var active = StringValue(old["liveView"], "aircraft") == "earthquakes" ? "earthquakes" : "aircraft";
            var inactive = active == "aircraft" ? "earthquakes" : "aircraft";
            var activeId = active == "aircraft" ? "aircraft-1" : "earthquakes-1";
            var activeCamera = old[active == "aircraft" ? "camera" : "earthquakeCamera"]?.DeepClone() ?? DefaultCamera();
            var inactiveCamera = old[inactive == "aircraft" ? "camera" : "earthquakeCamera"]?.DeepClone();
            var selection = context["selection"]?.DeepClone() ?? EmptySelection();
            var inactiveSelection = old[inactive == "aircraft" ? "aircraftSelection" : "earthquakeSelection"]?.DeepClone() ?? EmptySelection();
            var legacyFilters = context["filters"]?.DeepClone() ?? new JsonObject();
            var query = StringValue(context["filters"]?["query"], "");
            var freshness = StringValue(context["filters"]?["freshness"], "all");
            if (freshness is not ("recent" or "older")) freshness = "all";
            var wasDemo = StringValue(old["dataMode"], "live") == "demo";
            var aircraft = new JsonObject
            {
                ["id"] = "aircraft-1", ["domain"] = "aircraft", ["connectionId"] = "legacy-aircraft",
                ["datasetId"] = "legacy-aircraft:positions", ["visible"] = active == "aircraft" && !wasDemo,
                ["participating"] = active == "aircraft" && !wasDemo,
                ["appearance"] = DefaultAppearance(), ["query"] = old["aircraftQuery"]?.DeepClone() ?? DefaultQuery(),
                ["filters"] = new JsonObject { ["query"] = query, ["freshness"] = freshness },
                ["lastSelection"] = (active == "aircraft" ? selection : inactiveSelection).DeepClone()
            };
            var earthquake = new JsonObject
            {
                ["id"] = "earthquakes-1", ["domain"] = "earthquakes", ["connectionId"] = "legacy-earthquakes",
                ["datasetId"] = "legacy-earthquakes:events", ["visible"] = active == "earthquakes" && !wasDemo,
                ["participating"] = active == "earthquakes" && !wasDemo,
                ["appearance"] = DefaultAppearance(),
                ["filters"] = old["earthquakeSettings"]?.DeepClone() ?? DefaultEarthquakeFilters(),
                ["lastSelection"] = (active == "earthquakes" ? selection : inactiveSelection).DeepClone()
            };
            var migrated = new JsonObject
            {
                ["schemaVersion"] = 2, ["viewMode"] = old["viewMode"]?.DeepClone() ?? JsonValue.Create("canvas"),
                ["resultsOpen"] = old["resultsOpen"]?.DeepClone() ?? JsonValue.Create(false),
                ["sidebarOpen"] = old["sidebarOpen"]?.DeepClone() ?? JsonValue.Create(true),
                ["inspectorOpen"] = old["inspectorOpen"]?.DeepClone() ?? JsonValue.Create(false),
                ["sidebarWidth"] = old["sidebarWidth"]?.DeepClone() ?? JsonValue.Create(280),
                ["inspectorWidth"] = old["inspectorWidth"]?.DeepClone() ?? JsonValue.Create(360),
                ["sort"] = old["sort"]?.DeepClone() ?? JsonValue.Create("label"),
                ["expandedDetails"] = old["expandedDetails"]?.DeepClone() ?? JsonValue.Create(false),
                ["mapMode"] = old["mapMode"]?.DeepClone() ?? JsonValue.Create("2d"),
                ["basemapId"] = old["basemapId"]?.DeepClone(), ["camera"] = activeCamera,
                ["layers"] = new JsonArray(aircraft, earthquake), ["focusedLayerId"] = activeId,
                ["selectedLayerId"] = HasSelection(selection) ? JsonValue.Create(activeId) : null,
                ["resultScope"] = "focused",
                ["recovery"] = new JsonObject
                {
                    ["fromStateVersion"] = 1, ["inactiveDomain"] = inactive, ["inactiveCamera"] = inactiveCamera,
                    ["inactiveSelection"] = inactiveSelection.DeepClone(), ["legacyContextFilters"] = legacyFilters,
                    ["legacyDataMode"] = old["dataMode"]?.DeepClone(),
                    ["explanation"] = "The former inactive view remains available as a layer. Its prior camera and selection are kept here; enabling it does not move the shared camera automatically."
                }
            };
            if (migrated["basemapId"] is null) migrated.Remove("basemapId");
            if (migrated["recovery"]!["legacyDataMode"] is null) migrated["recovery"]!.AsObject().Remove("legacyDataMode");
            pane["state"] = migrated;
            pane["stateSchemaVersion"] = 2;
            context["layerIds"] = wasDemo ? new JsonArray() : new JsonArray(activeId);
            context["filters"] = new JsonObject();
        }
        return root.Deserialize<WorkspaceStateDto>(WorkspaceValidation.Json)!;
    }

    private static string StringValue(JsonNode? value, string fallback)
    {
        if (value is null || value.GetValueKind() != JsonValueKind.String) return fallback;
        try { return value.GetValue<string>(); } catch (InvalidOperationException) { return fallback; }
    }
    private static bool HasSelection(JsonNode selection) => selection["entityIds"]?.AsArray().Count > 0;
    private static JsonObject DefaultCamera() => new() { ["longitude"] = 12, ["latitude"] = 58, ["height"] = 2400000 };
    private static JsonObject DefaultQuery() => new() { ["longitude"] = 12, ["latitude"] = 58, ["radiusNm"] = 250 };
    private static JsonObject DefaultAppearance() => new() { ["opacity"] = 1, ["sizeScale"] = 1 };
    private static JsonObject EmptySelection() => new() { ["entityIds"] = new JsonArray(), ["observationIds"] = new JsonArray() };
    private static JsonObject DefaultEarthquakeFilters() => new() { ["query"] = "", ["minimumMagnitude"] = null, ["maxAgeHours"] = null, ["sort"] = "occurred" };
}
