using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Configurations;

public class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.HasKey(l => l.LogId);
        builder.Property(l => l.EventType).IsRequired().HasMaxLength(100);
        builder.Property(l => l.RecipientEmail).IsRequired().HasMaxLength(256);
        builder.Property(l => l.Subject).IsRequired().HasMaxLength(300);
        builder.Property(l => l.Status).IsRequired().HasMaxLength(20);
        builder.HasIndex(l => l.EventType);
        builder.ToTable("NotificationLogs");
    }
}
