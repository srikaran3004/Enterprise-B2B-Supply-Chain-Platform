using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Logistics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchJDeliveryAgentUserIdUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_DeliveryAgents_UserId",
                table: "DeliveryAgents",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DeliveryAgents_UserId",
                table: "DeliveryAgents");
        }
    }
}
