using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Infrastructure.Persistence.Configurations;

public class ShippingAddressConfiguration : IEntityTypeConfiguration<ShippingAddress>
{
    public void Configure(EntityTypeBuilder<ShippingAddress> builder)
    {
        builder.HasKey(s => s.AddressId);

        builder.Property(s => s.Label)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.AddressLine1)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(s => s.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.State)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.PinCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(s => s.District)
            .HasMaxLength(100);

        builder.Property(s => s.PhoneNumber)
            .HasMaxLength(20);

        builder.HasIndex(s => s.DealerId);

        builder.ToTable("ShippingAddresses");
    }
}
