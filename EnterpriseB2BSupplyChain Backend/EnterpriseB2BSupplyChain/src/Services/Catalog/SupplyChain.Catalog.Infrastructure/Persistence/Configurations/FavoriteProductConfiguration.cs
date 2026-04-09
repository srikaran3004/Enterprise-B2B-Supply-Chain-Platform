using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Configurations;

public class FavoriteProductConfiguration : IEntityTypeConfiguration<FavoriteProduct>
{
    public void Configure(EntityTypeBuilder<FavoriteProduct> builder)
    {
        builder.ToTable("FavoriteProducts");
        
        builder.HasKey(f => f.FavoriteId);
        
        builder.Property(f => f.DealerId).IsRequired();
        builder.Property(f => f.ProductId).IsRequired();
        builder.Property(f => f.CreatedAt).IsRequired();
        
        // Unique constraint: one dealer can favorite a product only once
        builder.HasIndex(f => new { f.DealerId, f.ProductId }).IsUnique();
        
        // Relationship with Product
        builder.HasOne(f => f.Product)
            .WithMany()
            .HasForeignKey(f => f.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
