using System.Text.Json;
using NJsonSchema;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Connections;

// Connector code and schemas are versioned; database rows are the active configuration.
public sealed class ConnectorRegistry
{
    private readonly Dictionary<string, JsonSchema> schemas;
    private readonly Dictionary<string, ConnectionTemplateDto> templates;
    private readonly Dictionary<string, ConnectorTypeDto> types;
    private readonly JsonSchema portableSchema;

    private ConnectorRegistry(Dictionary<string, JsonSchema> schemas, Dictionary<string, ConnectionTemplateDto> templates,
        Dictionary<string, ConnectorTypeDto> types, JsonSchema portableSchema)
    { this.schemas = schemas; this.templates = templates; this.types = types; this.portableSchema = portableSchema; }

    public static async Task<ConnectorRegistry> LoadAsync()
    {
        var root = AppContext.BaseDirectory;
        var types = new[] {
            new ConnectorTypeDto("adsb-lol", 1, "ADSB.lol aircraft", "aircraft",
                ["bounded_query", "live_subscription", "local_cache"], ["none"],
                "/api/v1/connections/connector-types/adsb-lol/settings-schema",
                "Public receiver coverage is incomplete; addresses may be reused or misreported.",
                "ADSB.lol contributors · ODbL 1.0", 30, 500, "adsb-lol"),
            new ConnectorTypeDto("usgs-earthquakes", 1, "USGS Earthquakes", "earthquake",
                ["current_catalog", "live_subscription", "local_cache"], ["none"],
                "/api/v1/connections/connector-types/usgs-earthquakes/settings-schema",
                "Worldwide reported events in the past-day M2.5+ feed; reporting can be revised.",
                "U.S. Geological Survey · contributing seismic networks", 60, 1000, "usgs-earthquakes")
        }.ToDictionary(x => x.Id, StringComparer.Ordinal);
        var schemas = new Dictionary<string, JsonSchema>(StringComparer.Ordinal);
        var templateSchema = await JsonSchema.FromFileAsync(Path.Combine(root, "Schemas", "connection-template.schema.json"));
        var portableSchema = await JsonSchema.FromFileAsync(Path.Combine(root, "Schemas", "connection-export.schema.json"));
        var templates = new Dictionary<string, ConnectionTemplateDto>(StringComparer.Ordinal);
        foreach (var type in types.Values)
        {
            schemas.Add(type.Id, await JsonSchema.FromFileAsync(Path.Combine(root, "Schemas", type.Id + "-settings.schema.json")));
            var rawTemplate = await File.ReadAllTextAsync(Path.Combine(root, "Templates", type.Id + ".json"));
            var template = JsonSerializer.Deserialize<ConnectionTemplateDto>(rawTemplate, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            if (template.ConnectorTypeId != type.Id || template.Version != 1 || template.SchemaVersion != 1 ||
                templateSchema.Validate(rawTemplate).Count != 0 || schemas[type.Id].Validate(template.Settings.GetRawText()).Count != 0)
                throw new InvalidOperationException("A bundled connection template does not match its connector schema.");
            templates.Add(template.Id, template);
        }
        return new(schemas, templates, types, portableSchema);
    }

    public ConnectorTypeDto[] Types => types.Values.OrderBy(x => x.Id).ToArray();
    public ConnectionTemplateDto[] Templates => templates.Values.OrderBy(x => x.Id).ToArray();
    public ConnectorTypeDto? Find(string id) => types.GetValueOrDefault(id);
    public ConnectionTemplateDto? Template(string id) => templates.GetValueOrDefault(id);
    public string[] Validate(string id, int schemaVersion, JsonElement settings)
    {
        if (!schemas.TryGetValue(id, out var schema)) return ["Unsupported connector type."];
        if (schemaVersion != 1) return ["Unsupported settings schema version."];
        if (settings.ValueKind != JsonValueKind.Object) return ["Settings must be an object."];
        if (settings.GetRawText().Length > 8192) return ["Settings exceed the 8 KiB limit."];
        return schema.Validate(settings.GetRawText()).Select(x => $"{x.Path}: {x.Kind}").Take(20).ToArray();
    }
    public string[] ValidateExport(JsonElement document) => document.ValueKind != JsonValueKind.Object || document.GetRawText().Length > 131072
        ? ["Portable definition must be an object of at most 128 KiB."] :
        portableSchema.Validate(document.GetRawText()).Select(x => $"{x.Path}: {x.Kind}").Take(20).ToArray();
    public int PollSeconds(string type, string settingsJson) => JsonDocument.Parse(settingsJson).RootElement.GetProperty("pollSeconds").GetInt32();
    public int DefaultPollSeconds(string type) => templates.Values.Single(x => x.ConnectorTypeId == type).Settings.GetProperty("pollSeconds").GetInt32();
    public DatasetRow NewDataset(string connectionId, string type)
    {
        var definition = types[type];
        var product = type == "adsb-lol" ? "positions" : "events";
        return new DatasetRow { Id = connectionId + ":" + product, ConnectionId = connectionId, ProductId = product,
            SourceId = definition.SourceId, Domain = definition.Domain,
            MetadataJson = JsonSerializer.Serialize(new { schemaVersion = 1, definition.Capabilities, definition.Coverage,
                definition.Attribution, allowedOperations = type == "adsb-lol" ? new[] { "query", "subscribe", "local_cache" } :
                    new[] { "catalog", "subscribe", "local_cache" } }) };
    }
    public DatasetDto Dataset(ConnectionRow connection, DatasetRow row)
    {
        var type = types[connection.ConnectorTypeId];
        var state = connection.RemovedAt is not null ? "removed" : !connection.Enabled ? "disabled" :
            connection.CredentialRef is not null ? "setup_required" : "available";
        return new(row.Id, row.ConnectionId, row.ProductId, row.SourceId, row.Domain,
            type.Capabilities, type.Coverage, type.Attribution,
            type.Domain == "aircraft" ? ["query", "subscribe", "local_cache"] : ["catalog", "subscribe", "local_cache"],
            PollSeconds(type.Id, connection.SettingsJson), type.Domain == "aircraft" ? 900 :
                Math.Max(180, PollSeconds(type.Id, connection.SettingsJson) * 3), state);
    }
}
