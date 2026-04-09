using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Configurations;

public class DealerCreditAccountConfiguration : IEntityTypeConfiguration<DealerCreditAccount>
{
    public void Configure(EntityTypeBuilder<DealerCreditAccount> builder)
    {
        builder.HasKey(a => a.AccountId);
        builder.HasIndex(a => a.DealerId).IsUnique();
        builder.Property(a => a.CreditLimit).HasColumnType("decimal(18,2)");
        builder.Property(a => a.CurrentOutstanding).HasColumnType("decimal(18,2)");
        builder.Ignore(a => a.AvailableCredit);
        builder.ToTable("DealerCreditAccounts");
    }
}
