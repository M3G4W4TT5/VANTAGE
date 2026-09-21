using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EarthquakeObservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DataType",
                schema: "platform",
                table: "observations",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Existing rows predate the data-type boundary. Preserve their JSON, IDs and provenance.
            migrationBuilder.Sql("UPDATE platform.observations SET \"DataType\" = 'aircraft' WHERE \"RecordJson\"->'entity'->>'kind' = 'aircraft'");

            migrationBuilder.CreateTable(
                name: "current_earthquakes",
                schema: "atlas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SourceId = table.Column<string>(type: "text", nullable: false),
                    OrderTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    InLatestFeed = table.Column<bool>(type: "boolean", nullable: false),
                    Position = table.Column<Point>(type: "geography (point,4326)", nullable: true),
                    RecordJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_current_earthquakes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "earthquake_feeds",
                schema: "atlas",
                columns: table => new
                {
                    SourceId = table.Column<string>(type: "text", nullable: false),
                    GeneratedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Total = table.Column<int>(type: "integer", nullable: false),
                    Rejected = table.Column<int>(type: "integer", nullable: false),
                    Truncated = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_earthquake_feeds", x => x.SourceId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_observations_DataType_SourceId_RetrievedAt",
                schema: "platform",
                table: "observations",
                columns: new[] { "DataType", "SourceId", "RetrievedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_current_earthquakes_Position",
                schema: "atlas",
                table: "current_earthquakes",
                column: "Position")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_current_earthquakes_SourceId_InLatestFeed_OccurredAt",
                schema: "atlas",
                table: "current_earthquakes",
                columns: new[] { "SourceId", "InLatestFeed", "OccurredAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "current_earthquakes",
                schema: "atlas");

            migrationBuilder.DropTable(
                name: "earthquake_feeds",
                schema: "atlas");

            migrationBuilder.DropIndex(
                name: "IX_observations_DataType_SourceId_RetrievedAt",
                schema: "platform",
                table: "observations");

            migrationBuilder.DropColumn(
                name: "DataType",
                schema: "platform",
                table: "observations");
        }
    }
}
