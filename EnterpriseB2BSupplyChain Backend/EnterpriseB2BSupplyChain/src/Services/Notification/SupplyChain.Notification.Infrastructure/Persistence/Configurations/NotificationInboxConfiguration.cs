using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Configurations;

public class NotificationInboxConfiguration : IEntityTypeConfiguration<NotificationInbox>
{
    public void Configure(EntityTypeBuilder<NotificationInbox> builder)
    {
        builder.HasKey(n => n.NotificationId);

        builder.Property(n => n.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(n => n.Message)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(n => n.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(n => n.DealerId);

        builder.ToTable("NotificationInbox");
    }
}
