using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_earthquake_feeds",
                schema: "platform",
                table: "earthquake_feeds");

            migrationBuilder.DropPrimaryKey(
                name: "PK_current_earthquakes",
                schema: "platform",
                table: "current_earthquakes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_current_aircraft",
                schema: "platform",
                table: "current_aircraft");

            migrationBuilder.EnsureSchema(
                name: "private");

            migrationBuilder.AddColumn<string>(
                name: "ConnectionId",
                schema: "platform",
                table: "earthquake_feeds",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "legacy-earthquakes");

            migrationBuilder.AddColumn<string>(
                name: "ConnectionId",
                schema: "platform",
                table: "current_earthquakes",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "legacy-earthquakes");

            migrationBuilder.AddColumn<string>(
                name: "ConnectionId",
                schema: "platform",
                table: "current_aircraft",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "legacy-aircraft");

            migrationBuilder.AddPrimaryKey(
                name: "PK_earthquake_feeds",
                schema: "platform",
                table: "earthquake_feeds",
                columns: new[] { "ConnectionId", "SourceId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_current_earthquakes",
                schema: "platform",
                table: "current_earthquakes",
                columns: new[] { "ConnectionId", "Id" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_current_aircraft",
                schema: "platform",
                table: "current_aircraft",
                columns: new[] { "ConnectionId", "Id" });

            migrationBuilder.CreateTable(
                name: "connections",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    OwnerId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ConnectorTypeId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    TemplateId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    TemplateVersion = table.Column<int>(type: "integer", nullable: true),
                    SchemaVersion = table.Column<int>(type: "integer", nullable: false),
                    Scope = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    WorkspaceId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Revision = table.Column<long>(type: "bigint", nullable: false),
                    SettingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CredentialRef = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_connections", x => x.Id);
                    table.CheckConstraint("CK_connections_scope", "(\"Scope\" = 'global' AND \"WorkspaceId\" IS NULL) OR (\"Scope\" = 'workspace' AND \"WorkspaceId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_connections_users_OwnerId",
                        column: x => x.OwnerId,
                        principalSchema: "platform",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "connection_secrets",
                schema: "private",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ConnectionId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Nonce = table.Column<byte[]>(type: "bytea", nullable: false),
                    Ciphertext = table.Column<byte[]>(type: "bytea", nullable: false),
                    Tag = table.Column<byte[]>(type: "bytea", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_connection_secrets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_connection_secrets_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalSchema: "platform",
                        principalTable: "connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "datasets",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ConnectionId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ProductId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Domain = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_datasets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_datasets_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalSchema: "platform",
                        principalTable: "connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "observation_deliveries",
                schema: "platform",
                columns: table => new
                {
                    ConnectionId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ObservationId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    DatasetId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ConfigurationRevision = table.Column<long>(type: "bigint", nullable: false),
                    RetrievedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_observation_deliveries", x => new { x.ConnectionId, x.ObservationId, x.ConfigurationRevision });
                    table.ForeignKey(
                        name: "FK_observation_deliveries_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalSchema: "platform",
                        principalTable: "connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_observation_deliveries_datasets_DatasetId",
                        column: x => x.DatasetId,
                        principalSchema: "platform",
                        principalTable: "datasets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_observation_deliveries_observations_ObservationId",
                        column: x => x.ObservationId,
                        principalSchema: "platform",
                        principalTable: "observations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_connection_secrets_ConnectionId",
                schema: "private",
                table: "connection_secrets",
                column: "ConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_connections_OwnerId_RemovedAt",
                schema: "platform",
                table: "connections",
                columns: new[] { "OwnerId", "RemovedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_datasets_ConnectionId_ProductId",
                schema: "platform",
                table: "datasets",
                columns: new[] { "ConnectionId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_observation_deliveries_DatasetId_RetrievedAt",
                schema: "platform",
                table: "observation_deliveries",
                columns: new[] { "DatasetId", "RetrievedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_observation_deliveries_ObservationId",
                schema: "platform",
                table: "observation_deliveries",
                column: "ObservationId");

            // One-time conversion of the previously active server configuration. No startup
            // seeder rewrites operator edits or recreates intentionally removed connections.
            migrationBuilder.Sql("""
                INSERT INTO platform.connections ("Id","OwnerId","Name","ConnectorTypeId","TemplateId","TemplateVersion",
                    "SchemaVersion","Scope","WorkspaceId","Enabled","Revision","SettingsJson","CredentialRef","CreatedAt","UpdatedAt")
                VALUES
                    ('legacy-aircraft', current_setting('vantage.initial_owner_id'), 'ADSB.lol aircraft', 'adsb-lol',
                     'adsb-lol-default', 1, 1, 'global', NULL,
                     current_setting('vantage.legacy_aircraft_enabled')::boolean, 1,
                     jsonb_build_object('pollSeconds',current_setting('vantage.legacy_aircraft_poll')::integer), NULL, NOW(), NOW()),
                    ('legacy-earthquakes', current_setting('vantage.initial_owner_id'), 'USGS Earthquakes', 'usgs-earthquakes',
                     'usgs-earthquakes-default', 1, 1, 'global', NULL,
                     current_setting('vantage.legacy_earthquake_enabled')::boolean, 1,
                     jsonb_build_object('pollSeconds',current_setting('vantage.legacy_earthquake_poll')::integer), NULL, NOW(), NOW());
                INSERT INTO platform.datasets ("Id","ConnectionId","ProductId","SourceId","Domain","MetadataJson")
                VALUES
                    ('legacy-aircraft:positions','legacy-aircraft','positions','adsb-lol','aircraft',
                     '{"schemaVersion":1,"capabilities":["bounded_query","live_subscription","local_cache"],"allowedOperations":["query","subscribe","local_cache"]}'::jsonb),
                    ('legacy-earthquakes:events','legacy-earthquakes','events','usgs-earthquakes','earthquake',
                     '{"schemaVersion":1,"capabilities":["current_catalog","live_subscription","local_cache"],"allowedOperations":["catalog","subscribe","local_cache"]}'::jsonb);
                INSERT INTO platform.observation_deliveries ("ConnectionId","DatasetId","ObservationId","ConfigurationRevision","RetrievedAt")
                SELECT CASE WHEN o."DataType" = 'aircraft' THEN 'legacy-aircraft' ELSE 'legacy-earthquakes' END,
                       CASE WHEN o."DataType" = 'aircraft' THEN 'legacy-aircraft:positions' ELSE 'legacy-earthquakes:events' END,
                       o."Id", 1, o."RetrievedAt"
                FROM platform.observations o
                WHERE (o."DataType" = 'aircraft' AND o."SourceId" = 'adsb-lol')
                   OR (o."DataType" = 'earthquake' AND o."SourceId" = 'usgs-earthquakes');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "connection_secrets",
                schema: "private");

            migrationBuilder.DropTable(
                name: "observation_deliveries",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "datasets",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "connections",
                schema: "platform");

            migrationBuilder.DropPrimaryKey(
                name: "PK_earthquake_feeds",
                schema: "platform",
                table: "earthquake_feeds");

            migrationBuilder.DropPrimaryKey(
                name: "PK_current_earthquakes",
                schema: "platform",
                table: "current_earthquakes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_current_aircraft",
                schema: "platform",
                table: "current_aircraft");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                schema: "platform",
                table: "earthquake_feeds");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                schema: "platform",
                table: "current_earthquakes");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                schema: "platform",
                table: "current_aircraft");

            migrationBuilder.AddPrimaryKey(
                name: "PK_earthquake_feeds",
                schema: "platform",
                table: "earthquake_feeds",
                column: "SourceId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_current_earthquakes",
                schema: "platform",
                table: "current_earthquakes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_current_aircraft",
                schema: "platform",
                table: "current_aircraft",
                column: "Id");
        }
    }
}
