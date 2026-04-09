using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OtpWorkflowRevamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OtpRecords_Users_UserId",
                table: "OtpRecords");

            migrationBuilder.DropIndex(
                name: "IX_OtpRecords_UserId",
                table: "OtpRecords");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "OtpRecords");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "OtpRecords",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PayloadJson",
                table: "OtpRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "OtpRecords",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_OtpRecords_Email_Purpose_IsUsed",
                table: "OtpRecords",
                columns: new[] { "Email", "Purpose", "IsUsed" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OtpRecords_Email_Purpose_IsUsed",
                table: "OtpRecords");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "OtpRecords");

            migrationBuilder.DropColumn(
                name: "PayloadJson",
                table: "OtpRecords");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "OtpRecords");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "OtpRecords",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_OtpRecords_UserId",
                table: "OtpRecords",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_OtpRecords_Users_UserId",
                table: "OtpRecords",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
