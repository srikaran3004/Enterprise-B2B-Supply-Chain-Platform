using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Configurations;

public class PaymentRecordConfiguration : IEntityTypeConfiguration<PaymentRecord>
{
    public void Configure(EntityTypeBuilder<PaymentRecord> builder)
    {
        builder.HasKey(p => p.PaymentId);
        builder.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Status).IsRequired().HasMaxLength(20);
        builder.Property(p => p.PaymentMode).IsRequired().HasMaxLength(20);
        builder.Property(p => p.ReferenceNo).HasMaxLength(100);
        builder.ToTable("PaymentRecords");
    }
}
