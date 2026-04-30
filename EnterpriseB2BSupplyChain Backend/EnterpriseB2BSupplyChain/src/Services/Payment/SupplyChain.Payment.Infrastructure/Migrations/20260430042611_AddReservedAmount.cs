using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Payment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReservedAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ReservedAmount",
                table: "DealerPurchaseLimitAccounts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReservedAmount",
                table: "DealerPurchaseLimitAccounts");
        }
    }
}
