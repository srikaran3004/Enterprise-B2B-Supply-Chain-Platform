using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Infrastructure.Persistence.Configurations;

public class OrderLineConfiguration : IEntityTypeConfiguration<OrderLine>
{
    public void Configure(EntityTypeBuilder<OrderLine> builder)
    {
        builder.HasKey(l => l.OrderLineId);

        builder.Property(l => l.ProductName).IsRequired().HasMaxLength(300);
        builder.Property(l => l.SKU).IsRequired().HasMaxLength(50);
        builder.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)").IsRequired();

        // LineTotal is computed — not stored
        builder.Ignore(l => l.LineTotal);

        builder.ToTable("OrderLines");
    }
}
