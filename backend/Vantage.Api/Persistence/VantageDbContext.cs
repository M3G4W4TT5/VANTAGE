using Microsoft.EntityFrameworkCore;

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

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("postgis");
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
