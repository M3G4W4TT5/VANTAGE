using System.Text.Json;

namespace Vantage.Api.Contracts;

// The geometry remains GeoJSON. Source properties are retained without assigning a domain meaning.
public sealed record GeoJsonGeometryDto(string Type, JsonElement Coordinates);
public sealed record GeoJsonObservationDto(string Id, string EntityId, string SourceId, DateTimeOffset? ObservedAt,
    DateTimeOffset RetrievedAt, GeoJsonGeometryDto? Geometry, string? LocationRole, PrecisionDto Precision,
    string EvidenceClass, JsonElement Properties, DateTimeOffset? ValidFrom, DateTimeOffset? ValidTo,
    ProvenanceDto Provenance, string? SupersedesObservationId = null, int SchemaVersion = 1);
public sealed record GeoJsonRecordDto(EntityDto Entity, GeoJsonObservationDto Observation,
    string IdentityRule, string? IdentityDescription = null);
public sealed record GeoJsonSourceDto(string Id, string Name, string DocumentationUrl, string TermsUrl,
    string Attribution, string[] Capabilities, int PollSeconds, int ResultLimit, int CacheHours,
    string Coverage, string ScopeLabel, int StaleAfterSeconds);
public sealed record GeoJsonCompletenessDto(int Returned, int Limit, bool Truncated, string Coverage,
    DateTimeOffset? FeedRetrievedAt, int? ProviderCount, int RejectedCount);
public sealed record GeoJsonBatchDto(int SchemaVersion, string SubscriptionId, long Sequence, DateTimeOffset GeneratedAt,
    bool Reset, GeoJsonRecordDto[] Upserts, string[] Removals, SourceHealthDto Health,
    GeoJsonCompletenessDto Completeness, GeoJsonSourceDto Source);
public sealed record GeoJsonSnapshotDto(GeoJsonRecordDto[] Records, GeoJsonCompletenessDto Completeness, GeoJsonSourceDto Source);
