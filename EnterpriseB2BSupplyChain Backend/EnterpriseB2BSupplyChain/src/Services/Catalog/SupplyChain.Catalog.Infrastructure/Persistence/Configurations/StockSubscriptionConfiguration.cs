using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Configurations;

public class StockSubscriptionConfiguration : IEntityTypeConfiguration<StockSubscription>
{
    public void Configure(EntityTypeBuilder<StockSubscription> builder)
    {
        builder.HasKey(s => s.SubscriptionId);

        builder.HasIndex(s => new { s.DealerId, s.ProductId }).IsUnique();

        builder.ToTable("StockSubscriptions");
    }
}
