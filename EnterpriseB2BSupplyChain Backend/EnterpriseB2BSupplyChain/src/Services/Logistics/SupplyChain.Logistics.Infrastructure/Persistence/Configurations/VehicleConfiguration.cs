using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.HasKey(v => v.VehicleId);
        builder.Property(v => v.RegistrationNo).IsRequired().HasMaxLength(20);
        builder.HasIndex(v => v.RegistrationNo).IsUnique();
        builder.Property(v => v.VehicleType).IsRequired().HasMaxLength(50);
        builder.Property(v => v.CapacityKg).HasColumnType("decimal(10,2)");
        builder.Property(v => v.Status).HasConversion<string>().HasMaxLength(20);
        builder.ToTable("Vehicles");
    }
}
