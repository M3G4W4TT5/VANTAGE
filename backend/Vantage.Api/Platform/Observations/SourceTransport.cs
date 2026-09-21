using System.Net;
namespace Vantage.Api.Platform.Observations;

public sealed class SourceException(string state, string message, TimeSpan? retryAfter = null) : Exception(message)
{
    public string State { get; } = state;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}
public static class SourceTransport
{
    // Adapters own destinations. DI disables redirects; responses and decoded bytes stay bounded.
    public static async Task<string> ReadAsync(HttpClient http, string url, string name, CancellationToken ct)
    {
        using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var retry = response.Headers.RetryAfter;
            var delay = retry?.Delta ?? (retry?.Date is { } date ? date - DateTimeOffset.UtcNow : null);
            var state = response.StatusCode switch {
                HttpStatusCode.TooManyRequests => "rate_limited", HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => "setup_required", _ => "offline" };
            throw new SourceException(state, $"{name} returned HTTP {(int)response.StatusCode}. Retaining the last available observations.", delay);
        }
        await response.Content.LoadIntoBufferAsync(4 * 1024 * 1024, ct);
        return await response.Content.ReadAsStringAsync(ct);
    }
    public static TimeSpan Backoff(int pollSeconds, int failures, TimeSpan? retryAfter)
    {
        var delay = TimeSpan.FromSeconds(Math.Min(900, pollSeconds * Math.Pow(2, Math.Min(failures, 4))) + Random.Shared.Next(1, 6));
        return retryAfter > delay ? retryAfter.Value : delay;
    }
}
