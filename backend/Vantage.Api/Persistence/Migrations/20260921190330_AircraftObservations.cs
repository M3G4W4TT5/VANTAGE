using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AircraftObservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "atlas");

            migrationBuilder.CreateTable(
                name: "current_aircraft",
                schema: "atlas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    OrderTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Position = table.Column<Point>(type: "geography (point,4326)", nullable: true),
                    RecordJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_current_aircraft", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "observations",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: false),
                    SourceId = table.Column<string>(type: "text", nullable: false),
                    ObservedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Position = table.Column<Point>(type: "geography (point,4326)", nullable: true),
                    RecordJson = table.Column<string>(type: "jsonb", nullable: false),
                    RawJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_observations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_current_aircraft_Position",
                schema: "atlas",
                table: "current_aircraft",
                column: "Position")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_current_aircraft_RetrievedAt",
                schema: "atlas",
                table: "current_aircraft",
                column: "RetrievedAt");

            migrationBuilder.CreateIndex(
                name: "IX_observations_EntityId_ObservedAt",
                schema: "platform",
                table: "observations",
                columns: new[] { "EntityId", "ObservedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_observations_Position",
                schema: "platform",
                table: "observations",
                column: "Position")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_observations_RetrievedAt",
                schema: "platform",
                table: "observations",
                column: "RetrievedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "current_aircraft",
                schema: "atlas");

            migrationBuilder.DropTable(
                name: "observations",
                schema: "platform");
        }
    }
}
