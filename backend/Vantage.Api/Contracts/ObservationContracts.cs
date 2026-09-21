namespace Vantage.Api.Contracts;

public sealed record ExternalIdDto(string Namespace, string Value);
public sealed record EntityDto(string Id, string Kind, string Label, ExternalIdDto[] ExternalIds, int SchemaVersion = 1);
public sealed record PointGeometryDto(double[] Coordinates, string Type = "Point");
public sealed record PrecisionDto(string Level = "unknown");
public sealed record ProvenanceDto(string SourceId, string SourceRecordId, string SourceUrl, string Attribution,
    string LicenseRef, string RawRef, string[] DerivedFrom, string TransformVersion, string? TransformDescription = null);
public sealed record SourceHealthDto(string State, string Message, DateTimeOffset? LastSuccessAt,
    DateTimeOffset? NextAttemptAt, int? ProviderCount, int RejectedCount = 0);
