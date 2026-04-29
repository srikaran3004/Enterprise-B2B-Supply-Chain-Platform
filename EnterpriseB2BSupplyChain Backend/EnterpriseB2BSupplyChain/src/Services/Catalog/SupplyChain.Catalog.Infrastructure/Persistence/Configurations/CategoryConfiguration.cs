using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.CategoryId);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(200);

        // Unique index on Name to prevent duplicate categories at DB level
        builder.HasIndex(c => c.Name)
            .IsUnique()
            .HasFilter("[IsActive] = 1")
            .HasDatabaseName("IX_Categories_Name_Active");

        builder.Property(c => c.Description)
            .HasMaxLength(500);

        builder.HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Soft-delete columns
        builder.Property(c => c.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);
        builder.Property(c => c.DeletedAt);

        // Global query filter: automatically excludes soft-deleted rows
        builder.HasQueryFilter(c => !c.IsDeleted);

        builder.ToTable("Categories");
    }
}
