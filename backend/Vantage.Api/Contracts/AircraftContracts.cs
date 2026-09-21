namespace Vantage.Api.Contracts;

public sealed record AircraftQuery(double Longitude = 12, double Latitude = 58, int RadiusNm = 250)
{
    [System.Text.Json.Serialization.JsonIgnore]
    public bool IsValid => double.IsFinite(Longitude) && Longitude is >= -180 and <= 180 &&
        double.IsFinite(Latitude) && Latitude is >= -85 and <= 85 && RadiusNm is >= 10 and <= 2000;
    public AircraftQuery Normalized() => new(Math.Round(Longitude, 2), Math.Round(Latitude, 2), RadiusNm);
}
public sealed record ExternalIdDto(string Namespace, string Value);
public sealed record EntityDto(string Id, string Kind, string Label, ExternalIdDto[] ExternalIds, int SchemaVersion = 1);
public sealed record PointGeometryDto(double[] Coordinates, string Type = "Point");
public sealed record PrecisionDto(string Level = "unknown");
public sealed record ProvenanceDto(string SourceId, string SourceRecordId, string SourceUrl, string Attribution,
    string LicenseRef, string RawRef, string[] DerivedFrom, string TransformVersion, string? TransformDescription = null);
public sealed record AircraftPropertiesDto(int SchemaVersion, string Address, string AddressNamespace, string? Callsign,
    string? Registration, string? AircraftType, string SourceType, double? SpeedMetresPerSecond,
    double? BarometricAltitudeMetres, double? EllipsoidAltitudeMetres, double? TrackDegrees,
    double? TrueHeadingDegrees, bool? OnGround, DateTimeOffset? PositionObservedAt,
    double? ContainmentRadiusMetres, string[] MlatFields);
public sealed record AircraftObservationDto(string Id, string EntityId, string SourceId, DateTimeOffset? ObservedAt,
    DateTimeOffset RetrievedAt, PointGeometryDto? Geometry, string? LocationRole, PrecisionDto Precision,
    string EvidenceClass, AircraftPropertiesDto Properties, ProvenanceDto Provenance, int SchemaVersion = 1);
public sealed record AircraftRecordDto(EntityDto Entity, AircraftObservationDto Observation, string IdentityRule, string? IdentityDescription = null);
public sealed record SourceHealthDto(string State, string Message, DateTimeOffset? LastSuccessAt,
    DateTimeOffset? NextAttemptAt, int? ProviderCount, int RejectedCount = 0);
public sealed record AircraftCompletenessDto(int Returned, int Limit, bool Truncated, string Coverage);
// Separate from user-context events. Removals mean leaving this query's current result, not ceasing to exist.
public sealed record AircraftBatchDto(int SchemaVersion, string SubscriptionId, long Sequence, DateTimeOffset GeneratedAt,
    bool Reset, AircraftQuery Query, AircraftRecordDto[] Upserts, string[] Removals,
    SourceHealthDto Health, AircraftCompletenessDto Completeness, AircraftSourceDto Source);
public sealed record AircraftSourceDto(string Id, string Name, string DocumentationUrl, string TermsUrl,
    string Attribution, string[] Capabilities, int PollSeconds, int MaximumRadiusNm, int ResultLimit, int CacheHours, int MinimumRadiusNm, string Coverage);
