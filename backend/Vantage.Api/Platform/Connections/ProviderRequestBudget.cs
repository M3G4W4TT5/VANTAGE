namespace Vantage.Api.Platform.Connections;

// Shared, bounded provider start cadence across demand and explicit previews.
// The provider key is the registered connector type, never a layer ID.
public sealed class ProviderRequestBudget
{
    private readonly object gate = new();
    private readonly Dictionary<string, DateTimeOffset> next = [];
    public DateTimeOffset? Reserve(string providerType, TimeSpan interval)
    {
        lock (gate)
        {
            var now = DateTimeOffset.UtcNow;
            if (next.TryGetValue(providerType, out var ready) && ready > now) return ready;
            next[providerType] = now + interval;
            return null;
        }
    }
}
