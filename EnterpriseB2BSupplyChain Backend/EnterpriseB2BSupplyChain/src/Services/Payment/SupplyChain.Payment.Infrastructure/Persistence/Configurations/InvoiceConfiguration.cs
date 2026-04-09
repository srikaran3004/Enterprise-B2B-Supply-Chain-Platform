using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.HasKey(i => i.InvoiceId);
        builder.HasIndex(i => i.InvoiceNumber).IsUnique();
        builder.HasIndex(i => i.OrderId).IsUnique();
        builder.HasIndex(i => i.IdempotencyKey).IsUnique();

        builder.Property(i => i.InvoiceNumber).IsRequired().HasMaxLength(30);
        builder.Property(i => i.IdempotencyKey).IsRequired().HasMaxLength(100);
        builder.Property(i => i.Subtotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.GstAmount).HasColumnType("decimal(18,2)");
        builder.Property(i => i.GrandTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.GstType).IsRequired().HasMaxLength(15);
        builder.Property(i => i.GstRate).HasColumnType("decimal(5,2)");
        builder.Property(i => i.PaymentMode).IsRequired().HasMaxLength(20);
        builder.Property(i => i.PdfStoragePath).HasMaxLength(500);

        builder.HasMany(i => i.Lines)
            .WithOne(l => l.Invoice)
            .HasForeignKey(l => l.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable("Invoices");
    }
}
