using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Order.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDealerNameEmailToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DealerEmail",
                table: "Orders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DealerName",
                table: "Orders",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DealerEmail",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DealerName",
                table: "Orders");
        }
    }
}
