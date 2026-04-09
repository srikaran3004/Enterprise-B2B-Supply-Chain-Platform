using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Catalog.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryNameUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name_Active",
                table: "Categories",
                column: "Name",
                unique: true,
                filter: "[IsActive] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Categories_Name_Active",
                table: "Categories");
        }
    }
}
