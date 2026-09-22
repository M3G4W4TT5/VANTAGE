using Microsoft.EntityFrameworkCore;
using Vantage.Api.Platform.Observations;
using Vantage.Api.Platform.Identity;

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
    public long Revision { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class VantageDbContext(DbContextOptions<VantageDbContext> options) : DbContext(options)
{
    public DbSet<PlatformUserRow> Users => Set<PlatformUserRow>();
    public DbSet<PersonalPreferencesRow> PersonalPreferences => Set<PersonalPreferencesRow>();
    public DbSet<WorkspaceRow> Workspaces => Set<WorkspaceRow>();
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
            e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasOne<PlatformUserRow>().WithOne().HasForeignKey<PersonalPreferencesRow>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("CK_personal_preferences_theme", "\"Theme\" IN ('dark', 'light')"));
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
            e.ToTable("current_aircraft", "platform"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SourceId, x.RetrievedAt });
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb");
            e.HasIndex(x => x.Position).HasMethod("gist"); e.HasIndex(x => x.RetrievedAt);
        });
        model.Entity<CurrentEarthquakeRow>(e =>
        {
            e.ToTable("current_earthquakes", "platform"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SourceId, x.InLatestFeed, x.OccurredAt });
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb");
            e.HasIndex(x => x.Position).HasMethod("gist");
        });
        model.Entity<EarthquakeFeedRow>(e => { e.ToTable("earthquake_feeds", "platform"); e.HasKey(x => x.SourceId); });
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
