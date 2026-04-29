using System;
using System.Collections.Generic;
using System.Text;

using SupplyChain.Catalog.Domain.Exceptions;

namespace SupplyChain.Catalog.Domain.Entities;

public class Category
{
    public Guid CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public Guid? ParentCategoryId { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // Soft delete
    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    // Self-referencing navigation
    public Category? ParentCategory { get; private set; }
    public ICollection<Category> SubCategories { get; private set; } = new List<Category>();
    public ICollection<Product> Products { get; private set; } = new List<Product>();

    private Category() { }

    public static Category Create(string name, string? description = null, Guid? parentCategoryId = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("INVALID_NAME", "Category name is required.");

        return new Category
        {
            CategoryId = Guid.NewGuid(),
            Name = name.Trim(),
            Description = description?.Trim(),
            ParentCategoryId = parentCategoryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(string name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("INVALID_NAME", "Category name is required.");

        Name = name.Trim();
        Description = description?.Trim();
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    /// <summary>Detach this category from its parent (prevents FK constraint on parent delete).</summary>
    public void ClearParent() => ParentCategoryId = null;

    /// <summary>
    /// Soft-delete: marks this category as deleted without physically removing the row.
    /// The global EF query filter will exclude it from all future queries.
    /// </summary>
    public void SoftDelete()
    {
        IsDeleted  = true;
        DeletedAt  = DateTime.UtcNow;
        IsActive   = false;
    }
}
