using Microsoft.EntityFrameworkCore;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;
using System.Text.RegularExpressions;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly CatalogDbContext _context;

    public CategoryRepository(CatalogDbContext context) => _context = context;

    public async Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken ct = default)
        => await _context.Categories.FirstOrDefaultAsync(c => c.CategoryId == categoryId, ct);

    public async Task<List<Category>> GetAllActiveAsync(CancellationToken ct = default)
        => await _context.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<List<Category>> GetAllAsync(CancellationToken ct = default)
        => await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<List<Category>> GetSubCategoriesAsync(Guid parentCategoryId, CancellationToken ct = default)
        => await _context.Categories
            .AsNoTracking()
            .Where(c => c.ParentCategoryId == parentCategoryId)
            .ToListAsync(ct);

    public async Task<bool> ExistsByNameAsync(string name, Guid? excludeCategoryId = null, CancellationToken ct = default)
    {
        var normalized = NormalizeName(name);

        var activeNames = await _context.Categories
            .AsNoTracking()
            .Where(c => c.IsActive && (excludeCategoryId == null || c.CategoryId != excludeCategoryId.Value))
            .Select(c => c.Name)
            .ToListAsync(ct);

        return activeNames.Any(existingName => NormalizeName(existingName) == normalized);
    }

    private static string NormalizeName(string value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        normalized = normalized.Replace("&", " and ");
        normalized = Regex.Replace(normalized, "[\\u2013\\u2014\\-_/]+", " ");
        normalized = Regex.Replace(normalized, "\\bcategories?\\b|\\bcategorie\\b", " ");
        normalized = Regex.Replace(normalized, "\\s+", " ").Trim();
        return normalized;
    }

    public async Task AddAsync(Category category, CancellationToken ct = default)
        => await _context.Categories.AddAsync(category, ct);

    public void Delete(Category category)
        => _context.Categories.Remove(category);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}