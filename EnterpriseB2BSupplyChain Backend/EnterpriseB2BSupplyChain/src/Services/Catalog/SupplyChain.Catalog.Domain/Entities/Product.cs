using System;
using System.Collections.Generic;
using System.Text;

using SupplyChain.Catalog.Domain.Enums;
using SupplyChain.Catalog.Domain.Exceptions;

namespace SupplyChain.Catalog.Domain.Entities;

public class Product
{
    public Guid ProductId { get; private set; }
    public string SKU { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Brand { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal UnitPrice { get; private set; }
    public int MinOrderQuantity { get; private set; }
    public int TotalStock { get; private set; }
    public int ReservedStock { get; private set; }
    public string? ImageUrl { get; private set; }
    public ProductStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    // Soft delete — never physically removed, just hidden via global EF query filter
    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    // Computed — not stored in DB
    public int AvailableStock => TotalStock - ReservedStock;
    public bool IsInStock => AvailableStock >= MinOrderQuantity;

    // Navigation
    public Category Category { get; private set; } = null!;
    public ICollection<StockSubscription> Subscriptions { get; private set; } = new List<StockSubscription>();

    private Product() { }

    public static Product Create(
        string sku,
        string name,
        string? description,
        string? brand,
        Guid categoryId,
        decimal unitPrice,
        int minOrderQuantity,
        int initialStock,
        string? imageUrl = null)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new DomainException("INVALID_SKU", "SKU is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("INVALID_NAME", "Product name is required.");

        if (unitPrice <= 0)
            throw new DomainException("INVALID_PRICE", "Unit price must be greater than zero.");

        if (minOrderQuantity <= 0)
            throw new DomainException("INVALID_MOQ", "Minimum order quantity must be at least 1.");

        if (initialStock < 0)
            throw new DomainException("INVALID_STOCK", "Initial stock cannot be negative.");

        return new Product
        {
            ProductId = Guid.NewGuid(),
            SKU = sku.Trim().ToUpperInvariant(),
            Name = name.Trim(),
            Description = description?.Trim(),
            Brand = brand?.Trim(),
            CategoryId = categoryId,
            UnitPrice = unitPrice,
            MinOrderQuantity = minOrderQuantity,
            TotalStock = initialStock,
            ReservedStock = 0,
            ImageUrl = imageUrl,
            Status = ProductStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string name,
        string? description,
        string? brand,
        decimal unitPrice,
        int minOrderQuantity,
        string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("INVALID_NAME", "Product name is required.");

        if (unitPrice <= 0)
            throw new DomainException("INVALID_PRICE", "Unit price must be greater than zero.");

        if (minOrderQuantity <= 0)
            throw new DomainException("INVALID_MOQ", "Minimum order quantity must be at least 1.");

        Name = name.Trim();
        Description = description?.Trim();
        Brand = brand?.Trim();
        UnitPrice = unitPrice;
        MinOrderQuantity = minOrderQuantity;
        ImageUrl = imageUrl;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddStock(int quantity)
    {
        if (quantity == 0)
            throw new DomainException("INVALID_QTY", "Stock adjustment quantity cannot be zero.");

        if (TotalStock + quantity < 0)
            throw new DomainException("INVALID_QTY", "Stock cannot become negative.");

        TotalStock += quantity;
        UpdatedAt = DateTime.UtcNow;
    }

    // Called when order is placed — reserves stock in Redis (no DB write needed here)
    // DB stock is only decremented on hard deduction (dispatch confirmed)
    public void HardDeductStock(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("INVALID_QTY", "Deduction quantity must be positive.");

        if (quantity > AvailableStock)
            throw new DomainException("INSUFFICIENT_STOCK", $"Only {AvailableStock} units available.");

        TotalStock -= quantity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangeCategory(Guid newCategoryId)
    {
        if (newCategoryId == Guid.Empty)
            throw new DomainException("INVALID_CATEGORY", "Category ID must be a valid non-empty GUID.");

        CategoryId = newCategoryId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        Status = ProductStatus.Inactive;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        Status = ProductStatus.Active;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Soft-delete: marks this product as deleted without physically removing the row.
    /// The global EF query filter (<c>!IsDeleted</c>) will exclude it from all future queries.
    /// </summary>
    public void SoftDelete()
    {
        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
        // Also deactivate so any residual non-filtered queries show correct status.
        Status    = ProductStatus.Inactive;
        UpdatedAt = DateTime.UtcNow;
    }
}
