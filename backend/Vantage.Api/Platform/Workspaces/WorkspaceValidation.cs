using System.Text.Json;
using NJsonSchema;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Workspaces;

public sealed class WorkspaceValidation(JsonSchema schema, IReadOnlyDictionary<string, (int Version, string Schema)> appStates)
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static async Task<WorkspaceValidation> LoadAsync(IReadOnlyDictionary<string, (int Version, string Schema)> appStates) => new(await JsonSchema.FromFileAsync(
        Path.Combine(AppContext.BaseDirectory, "Schemas", "records.schema.json")), appStates);

    public string? Validate(string id, int version, WorkspaceStateDto state)
    {
        if (version != 1) return "This workspace version is not supported. Its stored data has been preserved.";
        var json = JsonSerializer.Serialize(state, Json);
        if (json.Length > 131072) return "Workspace state exceeds the 128 KiB limit.";
        var errors = schema.Definitions["WorkspaceState"].Validate(json);
        if (errors.Count > 0) return $"Workspace structure is invalid at {errors.First().Path}.";
        var panes = state.Panes;
        if (panes.Select(p => p.Id).Distinct().Count() != panes.Length) return "Pane IDs must be unique.";
        var ids = panes.Select(p => p.Id).ToHashSet();
        using var root = JsonDocument.Parse(json);
        var active = root.RootElement.GetProperty("appStates").GetProperty("shell").GetProperty("activePaneId").GetString();
        if (active is null || !ids.Contains(active)) return "The active pane must exist.";
        if (state.LinkGroups.Select(g => g.Id).Distinct().Count() != state.LinkGroups.Length) return "Link group IDs must be unique.";
        var linkedPanes = new HashSet<string>();
        foreach (var group in state.LinkGroups)
        {
            if (group.PaneIds.Distinct().Count() != group.PaneIds.Length || group.PaneIds.Any(p => !ids.Contains(p) || !linkedPanes.Add(p)))
                return "Link groups must refer to distinct existing panes, with one group per pane.";
            if (group.Fields.Distinct().Count() != group.Fields.Length) return "Linked fields must be unique.";
        }
        foreach (var pane in panes)
        {
            using var context = JsonDocument.Parse(JsonSerializer.Serialize(pane.Context, Json));
            var c = context.RootElement;
            if (c.GetProperty("workspaceId").GetString() != id || c.GetProperty("paneId").GetString() != pane.Id)
                return "Pane context belongs to a different workspace or pane.";
            var group = state.LinkGroups.SingleOrDefault(g => g.PaneIds.Contains(pane.Id));
            if (c.GetProperty("linkGroupId").GetString() != group?.Id) return "Pane linking must match its link group.";
            var time = c.GetProperty("time");
            if (time.GetProperty("mode").GetString() == "replay")
            {
                var from = time.GetProperty("from").GetDateTimeOffset();
                var to = time.GetProperty("to").GetDateTimeOffset();
                var cursor = time.GetProperty("cursor").GetDateTimeOffset();
                if (from > to || cursor < from || cursor > to) return "Replay cursor must lie inside an ordered interval.";
            }
            if (appStates.TryGetValue(pane.AppId, out var contract) && (pane.StateSchemaVersion != contract.Version ||
                schema.Definitions[contract.Schema].Validate(JsonSerializer.Serialize(pane.State, Json)).Count > 0))
                return "App pane state is invalid or unsupported. Its stored data has been preserved.";
        }
        return null;
    }

    public static bool ValidName(string? name) => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 120;
}
