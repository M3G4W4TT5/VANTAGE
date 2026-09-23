using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GeoJsonFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "current_geojson",
                schema: "platform",
                columns: table => new
                {
                    ConnectionId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SourceTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    InLatestFeed = table.Column<bool>(type: "boolean", nullable: false),
                    Shape = table.Column<Geometry>(type: "geometry (Geometry,4326)", nullable: true),
                    RecordJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_current_geojson", x => new { x.ConnectionId, x.Id });
                    table.ForeignKey(
                        name: "FK_current_geojson_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalSchema: "platform",
                        principalTable: "connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "geojson_feeds",
                schema: "platform",
                columns: table => new
                {
                    ConnectionId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Total = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_geojson_feeds", x => x.ConnectionId);
                    table.ForeignKey(
                        name: "FK_geojson_feeds_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalSchema: "platform",
                        principalTable: "connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_current_geojson_ConnectionId_InLatestFeed_SourceTime",
                schema: "platform",
                table: "current_geojson",
                columns: new[] { "ConnectionId", "InLatestFeed", "SourceTime" });

            migrationBuilder.CreateIndex(
                name: "IX_current_geojson_Shape",
                schema: "platform",
                table: "current_geojson",
                column: "Shape")
                .Annotation("Npgsql:IndexMethod", "gist");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "current_geojson",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "geojson_feeds",
                schema: "platform");
        }
    }
}
