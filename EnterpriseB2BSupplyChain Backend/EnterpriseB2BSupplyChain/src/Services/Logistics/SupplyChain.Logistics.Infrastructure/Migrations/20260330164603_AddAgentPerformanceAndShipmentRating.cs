using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Logistics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentPerformanceAndShipmentRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerFeedback",
                table: "Shipments",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerRating",
                table: "Shipments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AverageRating",
                table: "DeliveryAgents",
                type: "decimal(3,2)",
                nullable: false,
                defaultValue: 0.0m);

            migrationBuilder.AddColumn<string>(
                name: "ServiceRegion",
                table: "DeliveryAgents",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "TotalDeliveries",
                table: "DeliveryAgents",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerFeedback",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "CustomerRating",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "AverageRating",
                table: "DeliveryAgents");

            migrationBuilder.DropColumn(
                name: "ServiceRegion",
                table: "DeliveryAgents");

            migrationBuilder.DropColumn(
                name: "TotalDeliveries",
                table: "DeliveryAgents");
        }
    }
}
