using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DisplayRegionAndTimeZone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultRegion",
                schema: "platform",
                table: "personal_preferences",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "northern-europe");

            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                schema: "platform",
                table: "personal_preferences",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "UTC");

            migrationBuilder.AddCheckConstraint(
                name: "CK_personal_preferences_region",
                schema: "platform",
                table: "personal_preferences",
                sql: "\"DefaultRegion\" IN ('northern-europe', 'denmark', 'europe', 'world')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_personal_preferences_region",
                schema: "platform",
                table: "personal_preferences");

            migrationBuilder.DropColumn(
                name: "DefaultRegion",
                schema: "platform",
                table: "personal_preferences");

            migrationBuilder.DropColumn(
                name: "TimeZone",
                schema: "platform",
                table: "personal_preferences");
        }
    }
}
