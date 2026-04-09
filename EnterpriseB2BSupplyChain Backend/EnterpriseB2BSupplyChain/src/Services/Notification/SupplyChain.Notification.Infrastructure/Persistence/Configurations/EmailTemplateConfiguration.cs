using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Configurations;

public class EmailTemplateConfiguration : IEntityTypeConfiguration<EmailTemplate>
{
    public void Configure(EntityTypeBuilder<EmailTemplate> builder)
    {
        builder.HasKey(t => t.TemplateId);
        builder.HasIndex(t => t.EventType).IsUnique();
        builder.Property(t => t.EventType).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Subject).IsRequired().HasMaxLength(300);
        builder.Property(t => t.HtmlBody).IsRequired();
        builder.ToTable("EmailTemplates");
    }
}
