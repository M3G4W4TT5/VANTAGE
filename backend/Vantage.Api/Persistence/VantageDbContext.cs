using Microsoft.EntityFrameworkCore;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Platform.Identity;
using Vantage.Api.Platform.Connections;

namespace Vantage.Api.Persistence;

public sealed class WorkspaceRow
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public long Revision { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public string StateJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class PersonalPreferencesRow
{
    public string UserId { get; set; } = "";
    public string Theme { get; set; } = "dark";
    public string DefaultRegion { get; set; } = "northern-europe";
    public string TimeZone { get; set; } = "UTC";
    public long Revision { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class VantageDbContext(DbContextOptions<VantageDbContext> options) : DbContext(options)
{
    public DbSet<PlatformUserRow> Users => Set<PlatformUserRow>();
    public DbSet<PersonalPreferencesRow> PersonalPreferences => Set<PersonalPreferencesRow>();
    public DbSet<WorkspaceRow> Workspaces => Set<WorkspaceRow>();
    public DbSet<ConnectionRow> Connections => Set<ConnectionRow>();
    public DbSet<DatasetRow> Datasets => Set<DatasetRow>();
    public DbSet<ConnectionSecretRow> ConnectionSecrets => Set<ConnectionSecretRow>();
    public DbSet<ObservationDeliveryRow> ObservationDeliveries => Set<ObservationDeliveryRow>();
    public DbSet<ObservationRow> Observations => Set<ObservationRow>();
    public DbSet<CurrentAircraftRow> CurrentAircraft => Set<CurrentAircraftRow>();

    public DbSet<CurrentEarthquakeRow> CurrentEarthquakes => Set<CurrentEarthquakeRow>();
    public DbSet<EarthquakeFeedRow> EarthquakeFeeds => Set<EarthquakeFeedRow>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("postgis");
        model.Entity<PlatformUserRow>(e =>
        {
            e.ToTable("users", "platform"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(160);
            e.Property(x => x.Issuer).HasMaxLength(512); e.Property(x => x.Subject).HasMaxLength(255);
            e.Property(x => x.DisplayName).HasMaxLength(120);
            e.HasIndex(x => new { x.Issuer, x.Subject }).IsUnique();
        });
        model.Entity<PersonalPreferencesRow>(e =>
        {
            e.ToTable("personal_preferences", "platform"); e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasMaxLength(160);
            e.Property(x => x.Theme).HasMaxLength(5);
            e.Property(x => x.DefaultRegion).HasMaxLength(40);
            e.Property(x => x.TimeZone).HasMaxLength(100);
            e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasOne<PlatformUserRow>().WithOne().HasForeignKey<PersonalPreferencesRow>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("CK_personal_preferences_theme", "\"Theme\" IN ('dark', 'light')"));
            e.ToTable(t => t.HasCheckConstraint("CK_personal_preferences_region", "\"DefaultRegion\" IN ('northern-europe', 'denmark', 'europe', 'world')"));
        });
        model.Entity<ConnectionRow>(e =>
        {
            e.ToTable("connections", "platform"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(160); e.Property(x => x.OwnerId).HasMaxLength(160);
            e.Property(x => x.Name).HasMaxLength(120); e.Property(x => x.ConnectorTypeId).HasMaxLength(80);
            e.Property(x => x.TemplateId).HasMaxLength(80); e.Property(x => x.WorkspaceId).HasMaxLength(160);
            e.Property(x => x.CredentialRef).HasMaxLength(160); e.Property(x => x.Scope).HasMaxLength(12);
            e.Property(x => x.SettingsJson).HasColumnType("jsonb"); e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasIndex(x => new { x.OwnerId, x.RemovedAt });
            e.HasOne<PlatformUserRow>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_connections_scope", "(\"Scope\" = 'global' AND \"WorkspaceId\" IS NULL) OR (\"Scope\" = 'workspace' AND \"WorkspaceId\" IS NOT NULL)"));
        });
        model.Entity<DatasetRow>(e =>
        {
            e.ToTable("datasets", "platform"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(160); e.Property(x => x.ConnectionId).HasMaxLength(160);
            e.Property(x => x.ProductId).HasMaxLength(80); e.Property(x => x.SourceId).HasMaxLength(80);
            e.Property(x => x.Domain).HasMaxLength(80); e.Property(x => x.MetadataJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.ConnectionId, x.ProductId }).IsUnique();
            e.HasOne<ConnectionRow>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<ConnectionSecretRow>(e =>
        {
            e.ToTable("connection_secrets", "private"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(160); e.Property(x => x.ConnectionId).HasMaxLength(160);
            e.Property(x => x.Ciphertext).HasColumnType("bytea"); e.Property(x => x.Nonce).HasColumnType("bytea");
            e.Property(x => x.Tag).HasColumnType("bytea");
            e.HasOne<ConnectionRow>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<ObservationDeliveryRow>(e =>
        {
            e.ToTable("observation_deliveries", "platform");
            e.HasKey(x => new { x.ConnectionId, x.ObservationId, x.ConfigurationRevision });
            e.Property(x => x.ConnectionId).HasMaxLength(160); e.Property(x => x.DatasetId).HasMaxLength(160);
            e.Property(x => x.ObservationId).HasMaxLength(160);
            e.HasIndex(x => new { x.DatasetId, x.RetrievedAt });
            e.HasOne<ConnectionRow>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<DatasetRow>().WithMany().HasForeignKey(x => x.DatasetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ObservationRow>().WithMany().HasForeignKey(x => x.ObservationId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<ObservationRow>(e =>
        {
            e.ToTable("observations", "platform"); e.HasKey(x => x.Id);
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb"); e.Property(x => x.RawJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.DataType, x.SourceId, x.RetrievedAt });
            e.HasIndex(x => new { x.EntityId, x.ObservedAt }); e.HasIndex(x => x.RetrievedAt);
            e.HasIndex(x => x.Position).HasMethod("gist");
        });
        model.Entity<CurrentAircraftRow>(e =>
        {
            e.ToTable("current_aircraft", "platform"); e.HasKey(x => new { x.ConnectionId, x.Id });
            e.Property(x => x.ConnectionId).HasMaxLength(160);
            e.HasIndex(x => new { x.SourceId, x.RetrievedAt });
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb");
            e.HasIndex(x => x.Position).HasMethod("gist"); e.HasIndex(x => x.RetrievedAt);
        });
        model.Entity<CurrentEarthquakeRow>(e =>
        {
            e.ToTable("current_earthquakes", "platform"); e.HasKey(x => new { x.ConnectionId, x.Id });
            e.Property(x => x.ConnectionId).HasMaxLength(160);
            e.HasIndex(x => new { x.SourceId, x.InLatestFeed, x.OccurredAt });
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb");
            e.HasIndex(x => x.Position).HasMethod("gist");
        });
        model.Entity<EarthquakeFeedRow>(e => { e.ToTable("earthquake_feeds", "platform"); e.HasKey(x => new { x.ConnectionId, x.SourceId }); e.Property(x => x.ConnectionId).HasMaxLength(160); });
        model.Entity<WorkspaceRow>(entity =>
        {
            entity.ToTable("workspaces", "platform");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(160);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Revision).IsConcurrencyToken();
            entity.Property(x => x.StateJson).HasColumnType("jsonb");
            entity.HasIndex(x => new { x.OwnerId, x.UpdatedAt });
            entity.Property(x => x.OwnerId).HasMaxLength(160);
            entity.HasOne<PlatformUserRow>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
