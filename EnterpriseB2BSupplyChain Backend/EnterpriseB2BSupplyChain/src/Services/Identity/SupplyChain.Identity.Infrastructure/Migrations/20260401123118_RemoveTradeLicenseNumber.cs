using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTradeLicenseNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TradeLicenseNumber",
                table: "DealerProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TradeLicenseNumber",
                table: "DealerProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }
    }
}
