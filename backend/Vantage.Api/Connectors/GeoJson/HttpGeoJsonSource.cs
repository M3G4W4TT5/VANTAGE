using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Vantage.Api.Contracts;
using Vantage.Api.Platform.Observations;

namespace Vantage.Api.Connectors.GeoJson;

public sealed record HttpGeoJsonSettings(string Endpoint, string SourceId, string SourceName, string Attribution,
    string TermsUrl, string Coverage, string IdentityProperty, string LabelProperty, string SourceTimeProperty,
    string ValidFromProperty, string ValidToProperty, string Authentication, int PollSeconds)
{
    public const int FeatureLimit = 500;
    public const int PayloadLimit = 1024 * 1024;
    public const int CoordinateLimit = 50000;
    public const int FeatureCoordinateLimit = 5000;
    public const int CacheHours = 48;

    public static HttpGeoJsonSettings Read(string json) =>
        JsonSerializer.Deserialize<HttpGeoJsonSettings>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

    public static string[] Validate(JsonElement settings)
    {
        var value = Read(settings.GetRawText());
        var problems = new List<string>();
        if (!PublicHttpsDestination.IsValid(value.Endpoint)) problems.Add("Endpoint must be a public HTTPS URL on port 443 without credentials, query, fragment or redirect.");
        if (!PublicHttpsDestination.IsValid(value.TermsUrl)) problems.Add("Source terms URL must be a public HTTPS URL on port 443.");
        foreach (var field in new[] { value.IdentityProperty, value.LabelProperty, value.SourceTimeProperty,
            value.ValidFromProperty, value.ValidToProperty })
            if (field.Length > 0 && !Regex.IsMatch(field, "^[A-Za-z_][A-Za-z0-9_.-]{0,79}$", RegexOptions.CultureInvariant))
                problems.Add("Mappings must be direct property keys containing letters, digits, underscore, dot or hyphen.");
        return problems.Distinct().ToArray();
    }

    public GeoJsonSourceDto Metadata => new(SourceId, SourceName, Endpoint, TermsUrl, Attribution,
        ["current_catalog", "live_subscription", "local_cache", "point_line_polygon"], PollSeconds,
        FeatureLimit, CacheHours, Coverage + " Snapshot omission does not prove physical disappearance or event end.",
        "Configured FeatureCollection", PollSeconds * 3);
}

// The actual socket is connected only to an address checked at connection time, preventing DNS rebinding.
public static class PublicHttpsDestination
{
    public static bool IsValid(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps && uri.Port == 443 && uri.UserInfo.Length == 0 &&
        uri.Query.Length == 0 && uri.Fragment.Length == 0 && uri.HostNameType == UriHostNameType.Dns &&
        uri.Host.Contains('.') && !uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) &&
        !uri.Host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase) &&
        !uri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase) &&
        !uri.Host.EndsWith(".test", StringComparison.OrdinalIgnoreCase) &&
        !uri.Host.EndsWith(".invalid", StringComparison.OrdinalIgnoreCase);

    public static bool IsPublic(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (IPAddress.IsLoopback(address)) return false;
        var b = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
            return b[0] is > 0 and < 224 && b[0] != 10 && b[0] != 127 &&
                !(b[0] == 100 && b[1] is >= 64 and <= 127) &&
                !(b[0] == 169 && b[1] == 254) && !(b[0] == 172 && b[1] is >= 16 and <= 31) &&
                !(b[0] == 192 && b[1] == 168) && !(b[0] == 192 && b[1] == 0) &&
                !(b[0] == 198 && b[1] is 18 or 19) && !(b[0] == 192 && b[1] == 0 && b[2] == 2) &&
                !(b[0] == 198 && b[1] == 51 && b[2] == 100) && !(b[0] == 203 && b[1] == 0 && b[2] == 113);
        return address.AddressFamily == AddressFamily.InterNetworkV6 && (b[0] & 0xe0) == 0x20 &&
            !(b[0] == 0x20 && b[1] == 0x01 && b[2] == 0x0d && b[3] == 0xb8);
    }

    public static async ValueTask<Stream> ConnectAsync(SocketsHttpConnectionContext context, CancellationToken ct)
    {
        var host = context.DnsEndPoint.Host;
        if (!IsValid($"https://{host}/") || context.DnsEndPoint.Port != 443)
            throw new SourceException("error", "The configured destination is not an allowed public HTTPS host.");
        var addresses = await Dns.GetHostAddressesAsync(host, ct);
        if (addresses.Length == 0 || addresses.Any(address => !IsPublic(address)))
            throw new SourceException("error", "The configured destination resolved to a non-public address.");
        foreach (var address in addresses)
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            try { await socket.ConnectAsync(address, 443, ct); return new NetworkStream(socket, ownsSocket: true); }
            catch (OperationCanceledException) { socket.Dispose(); throw; }
            catch (SocketException) { socket.Dispose(); }
        }
        throw new SourceException("offline", "The public GeoJSON destination could not be reached.");
    }
}

public sealed record GeoJsonDelivery(GeoJsonRecordDto Record, Geometry? Geometry, string RawJson);
public sealed record GeoJsonFetch(GeoJsonDelivery[] Records, DateTimeOffset RetrievedAt);

public sealed class HttpGeoJsonSource(HttpClient http)
{
    public async Task<GeoJsonFetch> FetchAsync(HttpGeoJsonSettings settings, string? bearer, CancellationToken ct)
    {
        if (!PublicHttpsDestination.IsValid(settings.Endpoint))
            throw new SourceException("error", "The configured GeoJSON destination is invalid.");
        if (settings.Authentication == "bearer" && string.IsNullOrWhiteSpace(bearer))
            throw new SourceException("setup_required", "A backend bearer credential is required.");
        using var request = new HttpRequestMessage(HttpMethod.Get, settings.Endpoint);
        request.Headers.Accept.ParseAdd("application/geo+json, application/json;q=0.9");
        if (settings.Authentication == "bearer")
            request.Headers.Authorization = new("Bearer", bearer);
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if ((int)response.StatusCode is >= 300 and < 400)
            throw new SourceException("error", "GeoJSON endpoint redirected; redirects are not followed.");
        if (!response.IsSuccessStatusCode)
        {
            var state = response.StatusCode switch { HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => "setup_required",
                HttpStatusCode.TooManyRequests => "rate_limited", _ => "offline" };
            var retry = response.Headers.RetryAfter?.Delta;
            throw new SourceException(state, $"GeoJSON endpoint returned HTTP {(int)response.StatusCode}; the last valid snapshot is retained.", retry);
        }
        var media = response.Content.Headers.ContentType?.MediaType;
        if (media is not ("application/geo+json" or "application/json") && (media is null || !media.EndsWith("+json", StringComparison.OrdinalIgnoreCase)))
            throw new SourceException("error", "GeoJSON endpoint returned a non-JSON content type.");
        if (response.Content.Headers.ContentLength > HttpGeoJsonSettings.PayloadLimit)
            throw new SourceException("error", "GeoJSON payload exceeds the 1 MiB decoded limit.");
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var buffer = new MemoryStream();
        var chunk = new byte[8192];
        int count;
        while ((count = await stream.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + count > HttpGeoJsonSettings.PayloadLimit)
                throw new SourceException("error", "GeoJSON payload exceeds the 1 MiB decoded limit.");
            buffer.Write(chunk, 0, count);
        }
        return Parse(buffer.ToArray(), settings, DateTimeOffset.UtcNow);
    }

    public static GeoJsonFetch Parse(byte[] payload, HttpGeoJsonSettings settings, DateTimeOffset retrievedAt)
    {
        if (payload.Length > HttpGeoJsonSettings.PayloadLimit)
            throw new SourceException("error", "GeoJSON payload exceeds the 1 MiB decoded limit.");
        try
        {
            using var document = JsonDocument.Parse(payload, new JsonDocumentOptions { MaxDepth = 32 });
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object || Text(root, "type") != "FeatureCollection" ||
                root.TryGetProperty("crs", out _) || !root.TryGetProperty("features", out var features) ||
                features.ValueKind != JsonValueKind.Array)
                throw Bad("Expected an RFC 7946 FeatureCollection with a features array and no alternate CRS.");
            if (features.GetArrayLength() > HttpGeoJsonSettings.FeatureLimit)
                throw Bad("FeatureCollection exceeds the 500-feature limit.");
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var records = new List<GeoJsonDelivery>(); var coordinates = 0;
            foreach (var (feature, index) in features.EnumerateArray().Select((value, index) => (value, index)))
            {
                if (feature.ValueKind != JsonValueKind.Object || Text(feature, "type") != "Feature" ||
                    !feature.TryGetProperty("properties", out var properties) || properties.ValueKind is not (JsonValueKind.Object or JsonValueKind.Null) ||
                    !feature.TryGetProperty("geometry", out var geometry))
                    throw Bad($"Feature {index + 1} is not a GeoJSON Feature with properties and geometry.");
                if (Encoding.UTF8.GetByteCount(properties.GetRawText()) > 16384)
                    throw Bad($"Feature {index + 1} exceeds the 16 KiB property limit.");
                var idValue = settings.IdentityProperty.Length == 0 ? Property(feature, "id") : Property(properties, settings.IdentityProperty);
                var featureId = Identifier(idValue);
                if (featureId is null) throw Bad($"Feature {index + 1} has a missing or invalid stable identifier.");
                if (!seen.Add(featureId)) throw Bad($"Feature {index + 1} repeats a stable identifier.");
                var label = settings.LabelProperty.Length == 0 ? featureId : Text(properties, settings.LabelProperty);
                if (string.IsNullOrWhiteSpace(label) || label.Length > 160) throw Bad($"Feature {index + 1} has an invalid mapped label.");
                var observed = Time(properties, settings.SourceTimeProperty, index);
                var validFrom = Time(properties, settings.ValidFromProperty, index);
                var validTo = Time(properties, settings.ValidToProperty, index);
                if (validFrom > validTo) throw Bad($"Feature {index + 1} has reversed validity times.");
                var shape = ParseGeometry(geometry, index, ref coordinates);
                var entityId = "geojson:" + Hash(settings.SourceId + "\0" + featureId);
                var canonical = JsonSerializer.Serialize(new { settings.SourceId, settings.Endpoint, settings.Attribution,
                    settings.TermsUrl, featureId, label, observed, validFrom,
                    validTo, geometry = geometry.Clone(), properties = properties.Clone() });
                var observationId = "obs:" + Hash(canonical);
                var provenance = new ProvenanceDto(settings.SourceId, featureId, settings.Endpoint, settings.Attribution,
                    settings.TermsUrl, observationId, [], "http-geojson/v1",
                    "Direct mapped fields only. WGS84 longitude/latitude; any third coordinate is preserved without an assumed altitude reference. Content identity excludes retrieval time.");
                var observation = new GeoJsonObservationDto(observationId, entityId, settings.SourceId, observed, retrievedAt,
                    geometry.ValueKind == JsonValueKind.Null ? null : new(Text(geometry, "type")!, geometry.GetProperty("coordinates").Clone()),
                    shape is null ? null : "source_geometry", new(), "reported", properties.Clone(), validFrom, validTo, provenance);
                var entity = new EntityDto(entityId, "geojson-feature", label, [new(settings.SourceId, featureId)]);
                records.Add(new(new(entity, observation, "source-feature-id/v1",
                    "Stable source-declared feature ID within this source. No cross-source merge or movement semantics are inferred."),
                    shape, feature.GetRawText()));
            }
            return new(records.ToArray(), retrievedAt);
        }
        catch (JsonException) { throw Bad("GeoJSON response is malformed JSON; the last valid snapshot is retained."); }
    }

    private static readonly GeometryFactory Factory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
    private static Geometry? ParseGeometry(JsonElement value, int index, ref int total)
    {
        if (value.ValueKind == JsonValueKind.Null) return null;
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("coordinates", out var coords) || coords.ValueKind != JsonValueKind.Array)
            throw Bad($"Feature {index + 1} has malformed or unsupported geometry.");
        var count = 0; var cumulative = total;
        Coordinate Position(JsonElement p)
        {
            if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() is < 2 or > 3 ||
                p[0].ValueKind != JsonValueKind.Number || p[1].ValueKind != JsonValueKind.Number ||
                !p[0].TryGetDouble(out var x) || !p[1].TryGetDouble(out var y) ||
                !double.IsFinite(x) || !double.IsFinite(y) || x is < -180 or > 180 || y is < -90 or > 90 ||
                p.GetArrayLength() == 3 && (p[2].ValueKind != JsonValueKind.Number || !p[2].TryGetDouble(out var z) || !double.IsFinite(z)))
                throw Bad($"Feature {index + 1} has invalid WGS84 coordinates.");
            count++; cumulative++;
            if (count > HttpGeoJsonSettings.FeatureCoordinateLimit || cumulative > HttpGeoJsonSettings.CoordinateLimit)
                throw Bad("GeoJSON coordinate limit was exceeded.");
            return new Coordinate(x, y);
        }
        Coordinate[] Line(JsonElement line, bool ring = false)
        {
            if (line.ValueKind != JsonValueKind.Array || line.GetArrayLength() < (ring ? 4 : 2))
                throw Bad($"Feature {index + 1} has an incomplete line or polygon ring.");
            var points = line.EnumerateArray().Select(Position).ToArray();
            if (ring && !points[0].Equals2D(points[^1])) throw Bad($"Feature {index + 1} has an open polygon ring.");
            return points;
        }
        Polygon Polygon(JsonElement polygon)
        {
            if (polygon.ValueKind != JsonValueKind.Array || polygon.GetArrayLength() == 0)
                throw Bad($"Feature {index + 1} has an empty polygon.");
            var rings = polygon.EnumerateArray().Select(ring => Factory.CreateLinearRing(Line(ring, true))).ToArray();
            return Factory.CreatePolygon(rings[0], rings[1..]);
        }
        Geometry result = Text(value, "type") switch
        {
            "Point" => Factory.CreatePoint(Position(coords)),
            "MultiPoint" when coords.GetArrayLength() > 0 => Factory.CreateMultiPoint(coords.EnumerateArray().Select(p => Factory.CreatePoint(Position(p))).ToArray()),
            "LineString" => Factory.CreateLineString(Line(coords)),
            "MultiLineString" when coords.GetArrayLength() > 0 => Factory.CreateMultiLineString(coords.EnumerateArray().Select(p => Factory.CreateLineString(Line(p))).ToArray()),
            "Polygon" => Polygon(coords),
            "MultiPolygon" when coords.GetArrayLength() > 0 => Factory.CreateMultiPolygon(coords.EnumerateArray().Select(Polygon).ToArray()),
            _ => throw Bad($"Feature {index + 1} uses unsupported or empty geometry; GeometryCollection is not supported.")
        };
        if (result.IsEmpty || !result.IsValid) throw Bad($"Feature {index + 1} has invalid geometry.");
        total = cumulative;
        return result;
    }
    private static JsonElement? Property(JsonElement value, string key) => value.ValueKind == JsonValueKind.Object && value.TryGetProperty(key, out var found) ? found : null;
    private static string? Text(JsonElement value, string key) => Property(value, key) is { ValueKind: JsonValueKind.String } p ? p.GetString() : null;
    private static string? Identifier(JsonElement? value)
    {
        var text = value?.ValueKind switch
        {
            JsonValueKind.String => value.Value.GetString(),
            JsonValueKind.Number when value.Value.TryGetInt64(out var integer) => integer.ToString(CultureInfo.InvariantCulture),
            _ => null
        };
        return text is { Length: > 0 and <= 100 } && !string.IsNullOrWhiteSpace(text) && !text.Any(char.IsControl) ? text : null;
    }
    private static DateTimeOffset? Time(JsonElement properties, string key, int index)
    {
        if (key.Length == 0 || Property(properties, key) is not { } value || value.ValueKind == JsonValueKind.Null) return null;
        var raw = value.ValueKind == JsonValueKind.String ? value.GetString() : null;
        if (raw is null || raw.Length > 64 || !Regex.IsMatch(raw,
                @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$", RegexOptions.CultureInvariant) ||
            !DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var instant) ||
            instant.Year is < 1900 or > 2100)
            throw Bad($"Feature {index + 1} has an invalid mapped ISO-8601 time.");
        return instant.ToUniversalTime();
    }
    private static string Hash(string value) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static SourceException Bad(string message) => new("error", message + " Last valid results are retained.");
}
