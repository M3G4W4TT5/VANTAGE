using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlatformOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Settings are supplied on the migration connection, never by a visitor or first login.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF nullif(current_setting('vantage.initial_owner_id', true), '') IS NULL
                    OR nullif(current_setting('vantage.initial_owner_issuer', true), '') IS NULL
                    OR nullif(current_setting('vantage.initial_owner_subject', true), '') IS NULL THEN
                    RAISE EXCEPTION 'Explicit initial operator mapping is required before ownership migration';
                  END IF;
                END $$;
                """);
            migrationBuilder.DropIndex(
                name: "IX_workspaces_UpdatedAt",
                schema: "platform",
                table: "workspaces");

            migrationBuilder.RenameTable(
                name: "earthquake_feeds",
                schema: "atlas",
                newName: "earthquake_feeds",
                newSchema: "platform");

            migrationBuilder.RenameTable(
                name: "current_earthquakes",
                schema: "atlas",
                newName: "current_earthquakes",
                newSchema: "platform");

            migrationBuilder.RenameTable(
                name: "current_aircraft",
                schema: "atlas",
                newName: "current_aircraft",
                newSchema: "platform");

            migrationBuilder.AddColumn<string>(
                name: "OwnerId",
                schema: "platform",
                table: "workspaces",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "users",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Issuer = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    CanUseData = table.Column<bool>(type: "boolean", nullable: false),
                    AccessRevision = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.Sql("""
                INSERT INTO platform.users ("Id", "Issuer", "Subject", "DisplayName", "Enabled", "CanUseData", "AccessRevision")
                VALUES (current_setting('vantage.initial_owner_id'), current_setting('vantage.initial_owner_issuer'),
                        current_setting('vantage.initial_owner_subject'), coalesce(nullif(current_setting('vantage.initial_owner_name', true), ''), 'Operator'), true, true, 1);
                UPDATE platform.workspaces SET "OwnerId" = current_setting('vantage.initial_owner_id');
                ALTER TABLE platform.workspaces ALTER COLUMN "OwnerId" DROP DEFAULT;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_OwnerId_UpdatedAt",
                schema: "platform",
                table: "workspaces",
                columns: new[] { "OwnerId", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_users_Issuer_Subject",
                schema: "platform",
                table: "users",
                columns: new[] { "Issuer", "Subject" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_workspaces_users_OwnerId",
                schema: "platform",
                table: "workspaces",
                column: "OwnerId",
                principalSchema: "platform",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_workspaces_users_OwnerId",
                schema: "platform",
                table: "workspaces");

            migrationBuilder.DropTable(
                name: "users",
                schema: "platform");

            migrationBuilder.DropIndex(
                name: "IX_workspaces_OwnerId_UpdatedAt",
                schema: "platform",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                schema: "platform",
                table: "workspaces");

            migrationBuilder.EnsureSchema(
                name: "atlas");

            migrationBuilder.RenameTable(
                name: "earthquake_feeds",
                schema: "platform",
                newName: "earthquake_feeds",
                newSchema: "atlas");

            migrationBuilder.RenameTable(
                name: "current_earthquakes",
                schema: "platform",
                newName: "current_earthquakes",
                newSchema: "atlas");

            migrationBuilder.RenameTable(
                name: "current_aircraft",
                schema: "platform",
                newName: "current_aircraft",
                newSchema: "atlas");

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_UpdatedAt",
                schema: "platform",
                table: "workspaces",
                column: "UpdatedAt");
        }
    }
}
