using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vantage.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkspaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "platform");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "workspaces",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Revision = table.Column<long>(type: "bigint", nullable: false),
                    SchemaVersion = table.Column<int>(type: "integer", nullable: false),
                    StateJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspaces", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_UpdatedAt",
                schema: "platform",
                table: "workspaces",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "workspaces",
                schema: "platform");
        }
    }
}
