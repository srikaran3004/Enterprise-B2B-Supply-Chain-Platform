using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Domain.Entities.Order>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Order> builder)
    {
        builder.HasKey(o => o.OrderId);

        builder.Property(o => o.OrderNumber)
            .IsRequired()
            .HasMaxLength(30);
        builder.HasIndex(o => o.OrderNumber).IsUnique();

        builder.Property(o => o.DealerId).IsRequired();
        builder.HasIndex(o => o.DealerId);

        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(o => o.TotalAmount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(o => o.ShippingFee)
            .HasColumnType("decimal(18,2)")
            .HasDefaultValue(0m)
            .IsRequired();

        builder.Property(o => o.PaymentMode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(o => o.Notes).HasMaxLength(1000);
        builder.Property(o => o.CancellationReason).HasMaxLength(500);
        builder.Property(o => o.DealerName).HasMaxLength(300);
        builder.Property(o => o.DealerEmail).HasMaxLength(200);

        // Explicitly configure datetime properties
        builder.Property(o => o.PlacedAt)
            .IsRequired();

        builder.Property(o => o.UpdatedAt)
            .IsRequired(false);

        builder.Property(o => o.ClosedAt)
            .IsRequired(false);

        builder.HasMany(o => o.Lines)
            .WithOne(l => l.Order)
            .HasForeignKey(l => l.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.StatusHistory)
            .WithOne(h => h.Order)
            .HasForeignKey(h => h.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(o => o.ReturnRequest)
            .WithOne(r => r.Order)
            .HasForeignKey<Domain.Entities.ReturnRequest>(r => r.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Optimistic concurrency token
        builder.Property(o => o.RowVersion)
            .IsRowVersion();

        builder.ToTable("Orders");
    }
}
