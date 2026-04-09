using Microsoft.EntityFrameworkCore;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly CatalogDbContext _context;

    public CategoryRepository(CatalogDbContext context) => _context = context;

    public async Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken ct = default)
        => await _context.Categories.FirstOrDefaultAsync(c => c.CategoryId == categoryId, ct);

    public async Task<List<Category>> GetAllActiveAsync(CancellationToken ct = default)
        => await _context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<List<Category>> GetAllAsync(CancellationToken ct = default)
        => await _context.Categories
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<List<Category>> GetSubCategoriesAsync(Guid parentCategoryId, CancellationToken ct = default)
        => await _context.Categories
            .Where(c => c.ParentCategoryId == parentCategoryId)
            .ToListAsync(ct);

    public async Task<bool> ExistsByNameAsync(string name, Guid? excludeCategoryId = null, CancellationToken ct = default)
    {
        var normalized = name.Trim().ToLower();

        return await _context.Categories.AnyAsync(c =>
            c.IsActive &&
            (excludeCategoryId == null || c.CategoryId != excludeCategoryId.Value) &&
            c.Name.ToLower() == normalized,
            ct);
    }

    public async Task AddAsync(Category category, CancellationToken ct = default)
        => await _context.Categories.AddAsync(category, ct);

    public void Delete(Category category)
        => _context.Categories.Remove(category);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}