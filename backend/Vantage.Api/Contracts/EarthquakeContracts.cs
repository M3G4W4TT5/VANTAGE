namespace Vantage.Api.Contracts;

public sealed record EarthquakePropertiesDto(int SchemaVersion, double? Magnitude, string? MagnitudeType,
    double? DepthKilometres, string DepthReference, string? Place, DateTimeOffset? SourceUpdatedAt,
    string? ReviewStatus, string? EventType, string? Network);
public sealed record EarthquakeObservationDto(string Id, string EntityId, string SourceId, DateTimeOffset? ObservedAt,
    DateTimeOffset RetrievedAt, PointGeometryDto? Geometry, string? LocationRole, PrecisionDto Precision,
    string EvidenceClass, EarthquakePropertiesDto Properties, ProvenanceDto Provenance,
    string? SupersedesObservationId = null, int SchemaVersion = 1);
public sealed record EarthquakeRecordDto(EntityDto Entity, EarthquakeObservationDto Observation, string IdentityRule, string? IdentityDescription = null);
public sealed record EarthquakeSourceDto(string Id, string Name, string DocumentationUrl, string TermsUrl,
    string Attribution, string[] Capabilities, int PollSeconds, int ResultLimit, int CacheHours,
    string Coverage, string ScopeLabel, int StaleAfterSeconds);
public sealed record EarthquakeCompletenessDto(int Returned, int Limit, bool Truncated, string Coverage,
    DateTimeOffset? FeedGeneratedAt, DateTimeOffset? FeedRetrievedAt, int? ProviderCount, int RejectedCount);
public sealed record EarthquakeBatchDto(int SchemaVersion, string SubscriptionId, long Sequence, DateTimeOffset GeneratedAt,
    bool Reset, EarthquakeRecordDto[] Upserts, string[] Removals, SourceHealthDto Health,
    EarthquakeCompletenessDto Completeness, EarthquakeSourceDto Source);
public sealed record EarthquakeSnapshotDto(EarthquakeRecordDto[] Records, EarthquakeCompletenessDto Completeness, EarthquakeSourceDto Source);
