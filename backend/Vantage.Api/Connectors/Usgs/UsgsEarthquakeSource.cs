using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Vantage.Api.Contracts;
using Vantage.Api.Platform.Observations;
namespace Vantage.Api.Connectors.Usgs;

public sealed partial class UsgsEarthquakeSource(HttpClient http, IConfiguration configuration) : IEarthquakeSource
{
    public const string SourceId = "usgs-earthquakes";
    public const string Endpoint = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
    public const string Terms = "https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits";
    public const string Credit = "U.S. Geological Survey · contributing seismic networks";
    public EarthquakeSourceDto Metadata { get; } = new(SourceId, "USGS Earthquakes",
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php", Terms, Credit,
        ["current_catalog", "live_subscription", "local_cache"], Math.Clamp(configuration.GetValue("Sources:Usgs:PollSeconds", 60), 60, 3600),
        EarthquakeCachePolicy.ResultLimit, EarthquakeCachePolicy.RetentionHours,
        "Worldwide reported events in the source's past-day M2.5+ feed. Detection and reporting are incomplete; locations and magnitudes may be revised.",
        "Past day · M2.5+ · worldwide", Math.Max(180, Math.Clamp(configuration.GetValue("Sources:Usgs:PollSeconds", 60), 60, 3600) * 3));
    public bool Enabled { get; } = configuration.GetValue("Sources:Usgs:Enabled", true);
    public async Task<EarthquakeFetch> FetchAsync(CancellationToken cancellation) =>
        Parse(await SourceTransport.ReadAsync(http, Endpoint, "USGS", cancellation), DateTimeOffset.UtcNow);

    public static EarthquakeFetch Parse(string payload, DateTimeOffset retrievedAt)
    {
        using var document = JsonDocument.Parse(payload, new JsonDocumentOptions { MaxDepth = 20 });
        var root = document.RootElement;
        if (Text(root, "type") != "FeatureCollection" || !root.TryGetProperty("metadata", out var metadata) ||
            Number(metadata, "status") != 200 || Number(metadata, "count") is not { } count || count < 0 || count % 1 != 0 ||
            !root.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array ||
            features.GetArrayLength() > 10000 || count != features.GetArrayLength() ||
            Timestamp(metadata, "generated", retrievedAt) is not { } generated)
            throw new SourceException("error", "USGS returned an invalid summary feed. The last successful feed is retained.");
        var records = new List<EarthquakeDelivery>(); var rejected = 0; var seen = new HashSet<string>();
        foreach (var feature in features.EnumerateArray())
        {
            if (Text(feature, "type") != "Feature" || Text(feature, "id") is not { } id || !IdPattern().IsMatch(id) ||
                !feature.TryGetProperty("properties", out var p) || p.ValueKind != JsonValueKind.Object || !seen.Add(id))
            { rejected++; continue; }
            if (records.Count >= EarthquakeCachePolicy.ResultLimit) continue;
            PointGeometryDto? geometry = null; double? depth = null;
            if (feature.TryGetProperty("geometry", out var g) && Text(g, "type") == "Point" &&
                g.TryGetProperty("coordinates", out var coords) && coords.ValueKind == JsonValueKind.Array && coords.GetArrayLength() == 3)
            {
                var lon = Finite(coords[0]); var lat = Finite(coords[1]); depth = Finite(coords[2]);
                if (lon is >= -180 and <= 180 && lat is >= -90 and <= 90) geometry = new([lon.Value, lat.Value]);
                // Negative depth is valid above the source's reference surface. Never treat depth as altitude.
                if (depth is < -20 or > 1000) depth = null;
            }
            var occurred = Timestamp(p, "time", retrievedAt); var updated = Timestamp(p, "updated", retrievedAt);
            // Missing times stay unknown. Present but malformed times reject the record instead of losing revision order.
            if (InvalidTimestamp(p, "time", occurred) || InvalidTimestamp(p, "updated", updated)) { rejected++; continue; }
            var entityId = $"{SourceId}:{id}";
            var properties = new EarthquakePropertiesDto(1, Bounded(p, "mag", -10, 15), Text(p, "magType", 40), depth,
                "Source-defined reference surface; varies by seismic network", Text(p, "place", 500), updated,
                Text(p, "status", 40), Text(p, "type", 80), Text(p, "net", 40));
            var canonical = JsonSerializer.Serialize(new { entityId, occurred, geometry, properties }, ContractJson.Options);
            var observationId = "obs:" + Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
            // Construct the public link from the validated source ID; never fetch URLs supplied in the payload.
            var provenance = new ProvenanceDto(SourceId, id, $"https://earthquake.usgs.gov/earthquakes/eventpage/{id}", Credit,
                Terms, observationId, [], "usgs-summary/v1",
                "Epoch milliseconds → UTC. Geometry retains longitude/latitude only; coordinate 3 is depth in kilometres. Normalized content plus source revision defines immutable versions; retrieval time is excluded.");
            var observation = new EarthquakeObservationDto(observationId, entityId, SourceId, occurred, retrievedAt, geometry,
                geometry is null ? null : "epicentre", new(), "reported", properties, provenance);
            var entity = new EntityDto(entityId, "earthquake", properties.Place ?? id, [new("usgs:event", id)]);
            records.Add(new(new(entity, observation, "usgs-event-id/v1", "Exact USGS event ID within this source. Aliases and different source IDs are not automatically merged."), feature.GetRawText()));
        }
        return new(records.ToArray(), (int)count, rejected, count > records.Count + rejected, generated, retrievedAt);
    }
    private static double? Finite(JsonElement value) => value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var n) && double.IsFinite(n) ? n : null;
    private static double? Number(JsonElement value, string key) => value.ValueKind == JsonValueKind.Object && value.TryGetProperty(key, out var p) ? Finite(p) : null;
    private static double? Bounded(JsonElement value, string key, double min, double max) => Number(value, key) is { } n && n >= min && n <= max ? n : null;
    private static string? Text(JsonElement value, string key, int max = 160)
    {
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty(key, out var p) || p.ValueKind != JsonValueKind.String) return null;
        var text = p.GetString()!.Trim(); return text.Length is > 0 && text.Length <= max ? text : null;
    }
    private static DateTimeOffset? Timestamp(JsonElement value, string key, DateTimeOffset retrieved) => Number(value, key) is { } n && n % 1 == 0 &&
        n >= 0 && n <= retrieved.ToUnixTimeMilliseconds() + 300000 ? DateTimeOffset.FromUnixTimeMilliseconds((long)n) : null;
    private static bool InvalidTimestamp(JsonElement value, string key, DateTimeOffset? parsed) => value.TryGetProperty(key, out var p) && p.ValueKind != JsonValueKind.Null && parsed is null;
    [GeneratedRegex("^[a-zA-Z0-9_-]{1,100}$", RegexOptions.CultureInvariant)] private static partial Regex IdPattern();
}
