using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.UserId);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .IsRequired();

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(u => u.PhoneNumber)
            .HasMaxLength(20);

        builder.Property(u => u.ProfilePictureUrl)
            .HasMaxLength(500);

        // Store enum as string so the DB is readable
        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(u => u.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(u => u.CreatedAt)
            .IsRequired();

        // Ignore domain events — not persisted
        builder.Ignore(u => u.DomainEvents);

        // One-to-one with DealerProfile
        builder.HasOne(u => u.DealerProfile)
            .WithOne(d => d.User)
            .HasForeignKey<DealerProfile>(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // One-to-many with RefreshTokens
        builder.HasMany<RefreshToken>()
            .WithOne(r => r.User)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable("Users");
    }
}