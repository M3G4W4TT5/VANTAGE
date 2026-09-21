using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Observations;

// A capability contract. Other source types get their own small contracts as they are introduced.
public interface IAircraftSource
{
    AircraftSourceDto Metadata { get; }
    bool Enabled { get; }
    TimeSpan MinimumRequestInterval { get; }
    Task<AircraftFetch> FetchAsync(AircraftQuery query, CancellationToken cancellation);
}

public sealed record AircraftDelivery(AircraftRecordDto Record, string RawJson);
public sealed record AircraftFetch(AircraftDelivery[] Records, int Total, int Rejected, bool Truncated);
public sealed class SourceException(string state, string message, TimeSpan? retryAfter = null) : Exception(message)
{
    public string State { get; } = state;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}

public sealed class AircraftSources
{
    public IAircraftSource Active { get; }
    public AircraftSources(IEnumerable<IAircraftSource> adapters, IConfiguration configuration)
    {
        var registered = adapters.ToDictionary(x => x.Metadata.Id, StringComparer.Ordinal);
        var id = configuration["Sources:Aircraft:Provider"];
        Active = id is null && registered.Count == 1 ? registered.Values.Single() :
            id is not null && registered.TryGetValue(id, out var source) ? source :
            throw new InvalidOperationException("Sources:Aircraft:Provider must identify a registered aircraft adapter.");
        var m = Active.Metadata;
        if (m.ResultLimit is < 1 or > AircraftCachePolicy.ResultLimit || m.MinimumRadiusNm < 10 ||
            m.MaximumRadiusNm > 2000 || m.MaximumRadiusNm < m.MinimumRadiusNm || m.PollSeconds < 1)
            throw new InvalidOperationException("The aircraft adapter declares unsupported limits.");
    }
    public bool Supports(AircraftQuery query) => query.IsValid &&
        query.RadiusNm >= Active.Metadata.MinimumRadiusNm && query.RadiusNm <= Active.Metadata.MaximumRadiusNm;
}

// Prototype resource budgets, independent of the selected provider.
public static class AircraftCachePolicy
{
    public const int ResultLimit = 500;
    public const int VisibleMinutes = 15;
    public const int RetentionHours = 24;
}
