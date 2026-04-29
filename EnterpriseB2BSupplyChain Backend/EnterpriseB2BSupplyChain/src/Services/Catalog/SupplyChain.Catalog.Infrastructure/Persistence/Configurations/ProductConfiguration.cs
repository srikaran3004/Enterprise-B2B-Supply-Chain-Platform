using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.ProductId);

        builder.Property(p => p.SKU)
            .IsRequired()
            .HasMaxLength(50);
        builder.HasIndex(p => p.SKU).IsUnique();

        builder.Property(p => p.Name).IsRequired().HasMaxLength(300);
        builder.Property(p => p.Description).HasMaxLength(2000);
        builder.Property(p => p.Brand).HasMaxLength(100);

        builder.Property(p => p.UnitPrice)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.HasIndex(p => new { p.Status, p.Name });
        builder.HasIndex(p => new { p.CategoryId, p.Status, p.Name });

        builder.Ignore(p => p.AvailableStock);
        builder.Ignore(p => p.IsInStock);

        // Soft-delete columns
        builder.Property(p => p.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);
        builder.Property(p => p.DeletedAt);

        // Global query filter: automatically excludes soft-deleted rows from every query
        builder.HasQueryFilter(p => !p.IsDeleted);

        builder.HasIndex(p => p.IsDeleted);  // Index for efficient filter evaluation

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.Subscriptions)
            .WithOne(s => s.Product)
            .HasForeignKey(s => s.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable("Products");
    }
}
