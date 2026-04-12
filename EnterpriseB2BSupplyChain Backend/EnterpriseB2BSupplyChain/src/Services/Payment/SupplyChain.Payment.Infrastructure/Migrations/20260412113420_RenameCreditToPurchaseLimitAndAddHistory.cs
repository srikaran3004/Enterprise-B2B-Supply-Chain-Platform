using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Payment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameCreditToPurchaseLimitAndAddHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_DealerCreditAccounts",
                table: "DealerCreditAccounts");

            migrationBuilder.RenameTable(
                name: "DealerCreditAccounts",
                newName: "DealerPurchaseLimitAccounts");

            migrationBuilder.RenameColumn(
                name: "CurrentOutstanding",
                table: "DealerPurchaseLimitAccounts",
                newName: "CurrentUtilized");

            migrationBuilder.RenameColumn(
                name: "CreditLimit",
                table: "DealerPurchaseLimitAccounts",
                newName: "PurchaseLimit");

            migrationBuilder.RenameIndex(
                name: "IX_DealerCreditAccounts_DealerId",
                table: "DealerPurchaseLimitAccounts",
                newName: "IX_DealerPurchaseLimitAccounts_DealerId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DealerPurchaseLimitAccounts",
                table: "DealerPurchaseLimitAccounts",
                column: "AccountId");

            migrationBuilder.CreateTable(
                name: "PurchaseLimitHistory",
                columns: table => new
                {
                    HistoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DealerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NewLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ChangedByRole = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseLimitHistory", x => x.HistoryId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseLimitHistory_ChangedAt",
                table: "PurchaseLimitHistory",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseLimitHistory_DealerId",
                table: "PurchaseLimitHistory",
                column: "DealerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseLimitHistory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DealerPurchaseLimitAccounts",
                table: "DealerPurchaseLimitAccounts");

            migrationBuilder.RenameTable(
                name: "DealerPurchaseLimitAccounts",
                newName: "DealerCreditAccounts");

            migrationBuilder.RenameColumn(
                name: "PurchaseLimit",
                table: "DealerCreditAccounts",
                newName: "CreditLimit");

            migrationBuilder.RenameColumn(
                name: "CurrentUtilized",
                table: "DealerCreditAccounts",
                newName: "CurrentOutstanding");

            migrationBuilder.RenameIndex(
                name: "IX_DealerPurchaseLimitAccounts_DealerId",
                table: "DealerCreditAccounts",
                newName: "IX_DealerCreditAccounts_DealerId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DealerCreditAccounts",
                table: "DealerCreditAccounts",
                column: "AccountId");
        }
    }
}
