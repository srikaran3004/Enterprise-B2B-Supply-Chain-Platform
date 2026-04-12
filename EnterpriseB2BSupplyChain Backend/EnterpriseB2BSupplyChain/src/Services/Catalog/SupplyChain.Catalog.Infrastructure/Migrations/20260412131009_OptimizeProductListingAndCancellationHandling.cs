using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Catalog.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeProductListingAndCancellationHandling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_CategoryId",
                table: "Products");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId_Status_Name",
                table: "Products",
                columns: new[] { "CategoryId", "Status", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Status_Name",
                table: "Products",
                columns: new[] { "Status", "Name" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_CategoryId_Status_Name",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Status_Name",
                table: "Products");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");
        }
    }
}
