using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Payment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveHsnCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HsnCode",
                table: "InvoiceLines");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HsnCode",
                table: "InvoiceLines",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }
    }
}
