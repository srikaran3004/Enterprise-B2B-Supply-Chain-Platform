using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Configurations;

public class DeliveryAgentConfiguration : IEntityTypeConfiguration<DeliveryAgent>
{
    public void Configure(EntityTypeBuilder<DeliveryAgent> builder)
    {
        builder.HasKey(a => a.AgentId);
        builder.Property(a => a.FullName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Phone).IsRequired().HasMaxLength(20);
        builder.Property(a => a.LicenseNumber).HasMaxLength(50);
        builder.Property(a => a.ServiceRegion).IsRequired().HasMaxLength(100).HasDefaultValue(string.Empty);
        builder.Property(a => a.TotalDeliveries).HasDefaultValue(0);
        builder.Property(a => a.AverageRating).HasColumnType("decimal(3,2)").HasDefaultValue(0.0m);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        builder.ToTable("DeliveryAgents");
    }
}
