using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Infrastructure.Persistence.Configurations;

public class OrderStatusHistoryConfiguration : IEntityTypeConfiguration<OrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
    {
        builder.HasKey(h => h.HistoryId);
        builder.Property(h => h.FromStatus).IsRequired().HasMaxLength(30);
        builder.Property(h => h.ToStatus).IsRequired().HasMaxLength(30);
        builder.Property(h => h.Notes).HasMaxLength(500);
        builder.Property(h => h.ChangedAt).IsRequired();
        builder.ToTable("OrderStatusHistory");
    }
}
