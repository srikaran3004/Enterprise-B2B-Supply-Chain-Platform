using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Infrastructure.Persistence.Configurations;

public class DealerProfileConfiguration : IEntityTypeConfiguration<DealerProfile>
{
    public void Configure(EntityTypeBuilder<DealerProfile> builder)
    {
        builder.HasKey(d => d.DealerProfileId);

        builder.Property(d => d.BusinessName)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(d => d.GstNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(d => d.GstNumber)
            .IsUnique();

        builder.Property(d => d.AddressLine1)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(d => d.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.State)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.PinCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.ToTable("DealerProfiles");
    }
}