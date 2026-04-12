using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Payment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyPurchaseLimitReset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastMonthlyResetAt",
                table: "DealerCreditAccounts",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1)");

            migrationBuilder.Sql(@"
UPDATE DealerCreditAccounts
SET LastMonthlyResetAt = DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1)
WHERE LastMonthlyResetAt IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastMonthlyResetAt",
                table: "DealerCreditAccounts");
        }
    }
}
