using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Vantage.Api.Platform.Identity;

public sealed record SessionProbe(string Issuer, string Subject, string RefreshToken);
public interface IIdentitySessionProbe
{
    Task<bool> IsActiveAsync(SessionProbe session, CancellationToken ct);
    Task RevokeAsync(SessionProbe session, CancellationToken ct);
}
// Standard OAuth introspection/revocation endpoints are operator-configured; tokens never leave backend requests.
public sealed class IdentitySessionProbe(HttpClient http, IOptions<IdentityOptions> configured, ILogger<IdentitySessionProbe>? logger = null) : IIdentitySessionProbe
{
    private IdentityOptions Options => configured.Value;
    public async Task<bool> IsActiveAsync(SessionProbe session, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, Options.IntrospectionEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string> {
                ["client_id"] = Options.ClientId, ["client_secret"] = Options.ClientSecret,
                ["token"] = session.RefreshToken, ["token_type_hint"] = "refresh_token" })
        };
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength > 65536)
        {
            logger?.LogInformation("Identity session probe rejected HTTP status {Status} or an oversized response.", (int)response.StatusCode);
            return false;
        }
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        // Bound both known and chunked responses; the configured identity service is the only destination.
        using var bounded = new MemoryStream();
        var buffer = new byte[4096]; int read;
        while ((read = await stream.ReadAsync(buffer, ct)) != 0) { if (bounded.Length + read > 65536) return false; bounded.Write(buffer, 0, read); }
        using var document = JsonDocument.Parse(bounded.ToArray());
        var root = document.RootElement;
        var activeMatch = root.TryGetProperty("active", out var active) && active.ValueKind == JsonValueKind.True;
        var issuerMatch = root.TryGetProperty("iss", out var issuer) && issuer.GetString() == session.Issuer;
        var subjectMatch = root.TryGetProperty("sub", out var subject) && subject.GetString() == session.Subject;
        var clientMatch = root.TryGetProperty("client_id", out var client) && client.GetString() == Options.ClientId;
        if (!activeMatch || !issuerMatch || !subjectMatch || !clientMatch)
            logger?.LogInformation("Identity session probe rejected: active={Active}, issuerMatch={IssuerMatch}, subjectMatch={SubjectMatch}, clientMatch={ClientMatch}.", activeMatch, issuerMatch, subjectMatch, clientMatch);
        return activeMatch && issuerMatch && subjectMatch && clientMatch;
    }
    public async Task RevokeAsync(SessionProbe session, CancellationToken ct)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string> {
            ["client_id"] = Options.ClientId, ["client_secret"] = Options.ClientSecret,
            ["token"] = session.RefreshToken, ["token_type_hint"] = "refresh_token" });
        using var response = await http.PostAsync(Options.RevocationEndpoint, content, ct);
    }
}
