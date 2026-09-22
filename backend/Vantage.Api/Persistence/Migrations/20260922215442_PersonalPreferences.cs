using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PersonalPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "personal_preferences",
                schema: "platform",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Theme = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Revision = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_personal_preferences", x => x.UserId);
                    table.CheckConstraint("CK_personal_preferences_theme", "\"Theme\" IN ('dark', 'light')");
                    table.ForeignKey(
                        name: "FK_personal_preferences_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "platform",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
            // The old shell theme is retained in v1 workspace JSON for recovery, but
            // the most recently edited workspace supplies the initial personal choice.
            migrationBuilder.Sql("""
                INSERT INTO platform.personal_preferences ("UserId", "Theme", "Revision", "UpdatedAt")
                SELECT u."Id",
                    COALESCE((SELECT CASE WHEN w."StateJson"->'appStates'->'shell'->>'theme' IN ('dark', 'light')
                        THEN w."StateJson"->'appStates'->'shell'->>'theme' END
                        FROM platform.workspaces w WHERE w."OwnerId" = u."Id"
                        ORDER BY w."UpdatedAt" DESC, w."Id" DESC LIMIT 1), 'dark'),
                    1, NOW()
                FROM platform.users u;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "personal_preferences",
                schema: "platform");
        }
    }
}
