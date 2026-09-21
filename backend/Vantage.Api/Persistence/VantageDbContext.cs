using Microsoft.EntityFrameworkCore;
using Vantage.Api.Platform.Observations;

namespace Vantage.Api.Persistence;

public sealed class WorkspaceRow
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public long Revision { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public string StateJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class VantageDbContext(DbContextOptions<VantageDbContext> options) : DbContext(options)
{
    public DbSet<WorkspaceRow> Workspaces => Set<WorkspaceRow>();
    public DbSet<ObservationRow> Observations => Set<ObservationRow>();
    public DbSet<CurrentAircraftRow> CurrentAircraft => Set<CurrentAircraftRow>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("postgis");
        model.Entity<ObservationRow>(e =>
        {
            e.ToTable("observations", "platform"); e.HasKey(x => x.Id);
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb"); e.Property(x => x.RawJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.EntityId, x.ObservedAt }); e.HasIndex(x => x.RetrievedAt);
            e.HasIndex(x => x.Position).HasMethod("gist");
        });
        model.Entity<CurrentAircraftRow>(e =>
        {
            e.ToTable("current_aircraft", "atlas"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SourceId, x.RetrievedAt });
            e.Property(x => x.Position).HasColumnType("geography (point,4326)");
            e.Property(x => x.RecordJson).HasColumnType("jsonb");
            e.HasIndex(x => x.Position).HasMethod("gist"); e.HasIndex(x => x.RetrievedAt);
        });
        model.Entity<WorkspaceRow>(entity =>
        {
            entity.ToTable("workspaces", "platform");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(160);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Revision).IsConcurrencyToken();
            entity.Property(x => x.StateJson).HasColumnType("jsonb");
            entity.HasIndex(x => x.UpdatedAt);
        });
    }
}
