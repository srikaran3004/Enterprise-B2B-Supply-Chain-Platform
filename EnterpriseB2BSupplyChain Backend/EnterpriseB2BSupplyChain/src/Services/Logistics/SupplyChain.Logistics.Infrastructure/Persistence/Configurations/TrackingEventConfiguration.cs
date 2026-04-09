using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Configurations;

public class TrackingEventConfiguration : IEntityTypeConfiguration<TrackingEvent>
{
    public void Configure(EntityTypeBuilder<TrackingEvent> builder)
    {
        builder.HasKey(t => t.EventId);
        builder.Property(t => t.Status).IsRequired().HasMaxLength(50);
        builder.Property(t => t.Latitude).HasColumnType("decimal(10,8)");
        builder.Property(t => t.Longitude).HasColumnType("decimal(11,8)");
        builder.Property(t => t.Notes).HasMaxLength(500);
        builder.HasIndex(t => t.ShipmentId);
        builder.ToTable("TrackingEvents");
    }
}
