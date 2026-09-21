using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AircraftSourceIsolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceId",
                schema: "atlas",
                table: "current_aircraft",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Preserve the source already recorded in each existing projection; never relabel on provider changes.
            migrationBuilder.Sql("""
                UPDATE atlas.current_aircraft SET "SourceId" = "RecordJson"->'observation'->>'sourceId';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_current_aircraft_SourceId_RetrievedAt",
                schema: "atlas",
                table: "current_aircraft",
                columns: new[] { "SourceId", "RetrievedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_current_aircraft_SourceId_RetrievedAt",
                schema: "atlas",
                table: "current_aircraft");

            migrationBuilder.DropColumn(
                name: "SourceId",
                schema: "atlas",
                table: "current_aircraft");
        }
    }
}
