namespace Vantage.Api.Platform.Connections;

public sealed record ConnectionDemandSnapshot(int Operations, int Consumers, string? HealthState, string? HealthMessage);

public static class BuiltinConnections
{
    public const string Aircraft = "legacy-aircraft";
    public const string Earthquakes = "legacy-earthquakes";
    public const string AircraftDataset = "legacy-aircraft:positions";
    public const string EarthquakeDataset = "legacy-earthquakes:events";
}

public sealed class ConnectionRow
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string Name { get; set; } = "";
    public string ConnectorTypeId { get; set; } = "";
    public string? TemplateId { get; set; }
    public int? TemplateVersion { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public string Scope { get; set; } = "global";
    public string? WorkspaceId { get; set; }
    public bool Enabled { get; set; } = true;
    public long Revision { get; set; } = 1;
    public string SettingsJson { get; set; } = "{}";
    public string? CredentialRef { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
}

public sealed class DatasetRow
{
    public string Id { get; set; } = "";
    public string ConnectionId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public string Domain { get; set; } = "";
    public string MetadataJson { get; set; } = "{}";
}

// The value is encrypted with an operator-held key and excluded from ordinary backups.
public sealed class ConnectionSecretRow
{
    public string Id { get; set; } = "";
    public string ConnectionId { get; set; } = "";
    public byte[] Nonce { get; set; } = [];
    public byte[] Ciphertext { get; set; } = [];
    public byte[] Tag { get; set; } = [];
    public DateTimeOffset UpdatedAt { get; set; }
}

// A single immutable observation may be delivered by more than one connection.
// This records acquisition context without rewriting its original source identity.
public sealed class ObservationDeliveryRow
{
    public string ConnectionId { get; set; } = "";
    public string DatasetId { get; set; } = "";
    public string ObservationId { get; set; } = "";
    public long ConfigurationRevision { get; set; }
    public DateTimeOffset RetrievedAt { get; set; }
}
