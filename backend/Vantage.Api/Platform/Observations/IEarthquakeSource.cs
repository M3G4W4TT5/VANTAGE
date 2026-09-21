using Vantage.Api.Contracts;
namespace Vantage.Api.Platform.Observations;

// One current source-defined catalog snapshot; this capability does not promise history or arbitrary queries.
public interface IEarthquakeSource
{
    EarthquakeSourceDto Metadata { get; }
    bool Enabled { get; }
    Task<EarthquakeFetch> FetchAsync(CancellationToken cancellation);
}
public sealed record EarthquakeDelivery(EarthquakeRecordDto Record, string RawJson);
public sealed record EarthquakeFetch(EarthquakeDelivery[] Records, int Total, int Rejected, bool Truncated,
    DateTimeOffset? GeneratedAt, DateTimeOffset RetrievedAt);
public sealed class EarthquakeSources
{
    public IEarthquakeSource Active { get; }
    public EarthquakeSources(IEnumerable<IEarthquakeSource> adapters, IConfiguration configuration)
    {
        var registered = adapters.ToDictionary(x => x.Metadata.Id, StringComparer.Ordinal);
        var id = configuration["Sources:Earthquakes:Provider"];
        Active = id is null && registered.Count == 1 ? registered.Values.Single() :
            id is not null && registered.TryGetValue(id, out var source) ? source :
            throw new InvalidOperationException("Sources:Earthquakes:Provider must identify a registered earthquake adapter.");
        var m = Active.Metadata;
        if (m.ResultLimit is < 1 or > EarthquakeCachePolicy.ResultLimit || m.PollSeconds is < 60 or > 3600 ||
            m.CacheHours is < 1 or > EarthquakeCachePolicy.RetentionHours || m.StaleAfterSeconds < m.PollSeconds)
            throw new InvalidOperationException("The earthquake adapter declares unsupported limits.");
    }
}
public static class EarthquakeCachePolicy
{
    public const int ResultLimit = 1000;
    public const int RetentionHours = 48;
    public const int ObservationLimit = 50000;
}
