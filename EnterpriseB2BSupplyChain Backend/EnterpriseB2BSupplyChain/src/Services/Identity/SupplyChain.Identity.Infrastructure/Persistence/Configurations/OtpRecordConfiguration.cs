using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Infrastructure.Persistence.Configurations;

public class OtpRecordConfiguration : IEntityTypeConfiguration<OtpRecord>
{
    public void Configure(EntityTypeBuilder<OtpRecord> builder)
    {
        builder.HasKey(o => o.OtpId);

        builder.Property(o => o.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(o => o.Purpose)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(o => o.OtpHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(o => o.PayloadJson)
            .HasColumnType("nvarchar(max)");

        builder.Property(o => o.ExpiresAt).IsRequired();
        builder.Property(o => o.CreatedAt).IsRequired();

        builder.HasIndex(o => new { o.Email, o.Purpose, o.IsUsed });

        builder.ToTable("OtpRecords");
    }
}