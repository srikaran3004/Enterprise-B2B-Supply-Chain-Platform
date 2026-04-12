using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Configurations;

public class PurchaseLimitHistoryConfiguration : IEntityTypeConfiguration<PurchaseLimitHistory>
{
    public void Configure(EntityTypeBuilder<PurchaseLimitHistory> builder)
    {
        builder.HasKey(x => x.HistoryId);
        builder.HasIndex(x => x.DealerId);
        builder.HasIndex(x => x.ChangedAt);

        builder.Property(x => x.PreviousLimit).HasColumnType("decimal(18,2)");
        builder.Property(x => x.NewLimit).HasColumnType("decimal(18,2)");
        builder.Property(x => x.ChangedAt).HasColumnType("datetime2");
        builder.Property(x => x.ChangedByRole).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(250);

        builder.ToTable("PurchaseLimitHistory");
    }
}
