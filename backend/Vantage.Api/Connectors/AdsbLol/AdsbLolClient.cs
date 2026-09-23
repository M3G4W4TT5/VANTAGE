using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Vantage.Api.Contracts;
using Vantage.Api.Platform.Observations;

namespace Vantage.Api.Connectors.AdsbLol;

public sealed partial class AdsbLolClient(HttpClient http) : IAircraftSource
{
    public AircraftSourceDto Metadata { get; } = new(SourceId, "ADSB.lol", "https://www.adsb.lol/docs/open-data/api/",
        License, Attribution, ["bounded_query", "live_subscription", "local_cache"],
        30, 250, ResultLimit,
        AircraftCachePolicy.RetentionHours, 10, "Public receiver coverage is incomplete; addresses may be reused or misreported.");
    public bool Enabled => true;
    public TimeSpan MinimumRequestInterval => TimeSpan.FromSeconds(8);
    public const string SourceId = "adsb-lol";
    public const string Attribution = "ADSB.lol contributors · ODbL 1.0";
    public const string License = "https://opendatacommons.org/licenses/odbl/1-0/";
    public const int ResultLimit = 500;

    public async Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken cancellation)
    {
        if (!query.IsValid || query.RadiusNm > Metadata.MaximumRadiusNm) throw new ArgumentException("Invalid aircraft query.");
        // Only this fixed HTTPS origin and numeric, bounded paths can be requested. Redirects are disabled in DI.
        var url = string.Create(CultureInfo.InvariantCulture,
            $"https://api.adsb.lol/v2/point/{query.Latitude:0.00}/{query.Longitude:0.00}/{query.RadiusNm}");
        var payload = await SourceTransport.ReadAsync(http, url, "ADSB.lol", cancellation);
        return Parse(payload, DateTimeOffset.UtcNow, url);
    }

    public static AircraftFetch Parse(string payload, DateTimeOffset retrievedAt, string sourceUrl)
    {
        using var document = JsonDocument.Parse(payload, new JsonDocumentOptions { MaxDepth = 20 });
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object || Number(root, "now") is not { } now ||
            now < 1_500_000_000_000 || now > retrievedAt.ToUnixTimeMilliseconds() + 300_000 ||
            !root.TryGetProperty("ac", out var items) || items.ValueKind != JsonValueKind.Array || items.GetArrayLength() > 10000 ||
            Text(root, "msg") != "No error") throw new SourceException("error", "ADSB.lol supplied an unsupported or invalid response.");
        var sourceTime = DateTimeOffset.FromUnixTimeMilliseconds((long)now);
        var records = new List<AircraftDelivery>(); var rejected = 0;
        foreach (var item in items.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object || Text(item, "hex") is not { } address || !AddressPattern().IsMatch(address))
            { rejected++; continue; }
            if (records.Count >= ResultLimit) continue;
            address = address.ToLowerInvariant();
            var ns = address.StartsWith('~') ? "adsb-lol:non-icao" : "icao24";
            var entityId = $"adsb-lol:{address}";
            var callsign = Text(item, "flight", 16)?.Trim();
            if (callsign?.Length == 0) callsign = null;
            var lon = Bounded(item, "lon", -180, 180); var lat = Bounded(item, "lat", -90, 90);
            PointGeometryDto? geometry = lon.HasValue && lat.HasValue ? new([lon.Value, lat.Value]) : null;
            var seen = Bounded(item, "seen", 0, 86400); var seenPosition = Bounded(item, "seen_pos", 0, 86400);
            var positionAt = geometry is not null && seenPosition.HasValue ? sourceTime.AddMilliseconds(-Math.Round(seenPosition.Value * 1000)) : (DateTimeOffset?)null;
            var observedAt = seen.HasValue ? sourceTime.AddMilliseconds(-Math.Round(seen.Value * 1000)) : (DateTimeOffset?)null;
            var type = Text(item, "type", 40) ?? "unknown";
            var mlat = item.TryGetProperty("mlat", out var fields) && fields.ValueKind == JsonValueKind.Array ?
                fields.EnumerateArray().Where(f => f.ValueKind == JsonValueKind.String && f.GetString()!.Length <= 40).Take(40).Select(f => f.GetString()!).ToArray() : [];
            var evidence = type == "mlat" || mlat.Contains("lat") || mlat.Contains("lon") ? "inferred" : "reported";
            var properties = new AircraftPropertiesDto(1, address, ns, callsign, Text(item, "r", 30), Text(item, "t", 30), type,
                Bounded(item, "gs", 0, 3000) * (1852d / 3600), Bounded(item, "alt_baro", -2000, 100000) * 0.3048,
                Bounded(item, "alt_geom", -2000, 100000) * 0.3048, Bounded(item, "track", 0, 360),
                Bounded(item, "true_heading", 0, 360), Text(item, "alt_baro") == "ground" ? true : Number(item, "alt_baro").HasValue ? false : null,
                positionAt, Bounded(item, "rc", 0, 1_000_000), mlat);
            // The ID includes source times and normalized values, never retrieval time or volatile receiver counters.
            var canonical = JsonSerializer.Serialize(new { entityId, observedAt, geometry, properties }, ContractJson.Options);
            var id = "obs:" + Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
            var provenance = new ProvenanceDto(SourceId, address, sourceUrl, Attribution, License, id, [], "adsb-lol/v1",
                "Feet × 0.3048 → metres; knots × 1852 / 3600 → m/s; API milliseconds minus seen/seen_pos → UTC. Other field times unknown. MLAT-derived positions are inferred.");
            var observation = new AircraftObservationDto(id, entityId, SourceId, observedAt, retrievedAt, geometry,
                geometry is null ? null : "physical_asset", new(), evidence, properties, provenance);
            var entity = new EntityDto(entityId, "aircraft", callsign ?? address.ToUpperInvariant(), [new(ns, address)]);
            records.Add(new(new(entity, observation, "adsb-lol-address/v1", "Exact provider address scoped to ADSB.lol. No cross-source association."), item.GetRawText()));
        }
        var total = Bounded(root, "total", 0, 10000000);
        if (!total.HasValue || total.Value < items.GetArrayLength()) throw new SourceException("error", "ADSB.lol returned an invalid result count.");
        return new(records.ToArray(), (int)total.Value, rejected, total > records.Count + rejected);
    }
    private static double? Number(JsonElement item, string key) => item.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n) && double.IsFinite(n) ? n : null;
    private static double? Bounded(JsonElement item, string key, double min, double max) => Number(item, key) is { } n && n >= min && n <= max ? n : null;
    private static string? Text(JsonElement item, string key, int max = 160) => item.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String && v.GetString()!.Length <= max ? v.GetString() : null;
    [GeneratedRegex("^~?[0-9a-fA-F]{6}$", RegexOptions.CultureInvariant)] private static partial Regex AddressPattern();
}
