using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Infrastructure.Persistence.Configurations;

public class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.HasKey(m => m.MessageId);
        builder.Property(m => m.EventType).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Payload).IsRequired();
        builder.Property(m => m.Status).IsRequired().HasMaxLength(20);
        builder.HasIndex(m => m.Status);   // Fast lookup for poller: WHERE Status = 'Pending'
        builder.HasIndex(m => m.CreatedAt);
        builder.ToTable("OutboxMessages");
    }
}
