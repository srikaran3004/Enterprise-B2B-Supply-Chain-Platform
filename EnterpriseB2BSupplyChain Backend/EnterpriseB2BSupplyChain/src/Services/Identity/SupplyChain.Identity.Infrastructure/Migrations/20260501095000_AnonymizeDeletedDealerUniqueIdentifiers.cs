using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupplyChain.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AnonymizeDeletedDealerUniqueIdentifiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE dp
                SET GstNumber = LEFT(CONCAT('DEL', LOWER(REPLACE(CONVERT(nvarchar(36), dp.UserId), '-', ''))), 20)
                FROM DealerProfiles AS dp
                INNER JOIN Users AS u ON u.UserId = dp.UserId
                WHERE u.IsDeleted = 1
                  AND dp.GstNumber NOT LIKE 'DEL%';
                """);

            migrationBuilder.Sql("""
                UPDATE Users
                SET Email = CONCAT('deleted-', LOWER(REPLACE(CONVERT(nvarchar(36), UserId), '-', '')), '@deleted.local')
                WHERE IsDeleted = 1
                  AND Email NOT LIKE 'deleted-%@deleted.local';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The original email/GST values are intentionally not restored because this
            // migration releases unique identifiers from permanently deleted accounts.
        }
    }
}
