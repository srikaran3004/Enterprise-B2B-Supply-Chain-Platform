using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Payment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchJInvoiceDealerIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Invoices_DealerId",
                table: "Invoices",
                column: "DealerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invoices_DealerId",
                table: "Invoices");
        }
    }
}
