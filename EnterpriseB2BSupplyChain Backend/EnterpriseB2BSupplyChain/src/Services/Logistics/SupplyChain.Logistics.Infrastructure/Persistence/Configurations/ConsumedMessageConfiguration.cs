using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Configurations;

public class ConsumedMessageConfiguration : IEntityTypeConfiguration<ConsumedMessage>
{
    public void Configure(EntityTypeBuilder<ConsumedMessage> builder)
    {
        builder.HasKey(x => x.MessageLogId);

        builder.Property(x => x.MessageId)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Consumer)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.EventType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.CorrelationId)
            .HasMaxLength(100);

        builder.HasIndex(x => new { x.MessageId, x.Consumer })
            .IsUnique();

        builder.HasIndex(x => x.ProcessedAtUtc);

        builder.ToTable("ConsumedMessages");
    }
}
