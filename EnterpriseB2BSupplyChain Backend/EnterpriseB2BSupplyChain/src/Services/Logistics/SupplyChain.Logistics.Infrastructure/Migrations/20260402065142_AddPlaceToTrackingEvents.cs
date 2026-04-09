using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Logistics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaceToTrackingEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Place",
                table: "TrackingEvents",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Place",
                table: "TrackingEvents");
        }
    }
}
