using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchJAddressDefaultIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ShippingAddresses_DealerId_IsDefault",
                table: "ShippingAddresses",
                columns: new[] { "DealerId", "IsDefault" },
                unique: true,
                filter: "[IsDefault] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShippingAddresses_DealerId_IsDefault",
                table: "ShippingAddresses");
        }
    }
}
