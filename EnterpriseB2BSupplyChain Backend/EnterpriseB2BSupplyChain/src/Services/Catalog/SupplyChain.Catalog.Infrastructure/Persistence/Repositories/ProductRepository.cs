using Microsoft.EntityFrameworkCore;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;
using SupplyChain.Catalog.Domain.Enums;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly CatalogDbContext _context;

    public ProductRepository(CatalogDbContext context) => _context = context;

    public async Task<Product?> GetByIdAsync(Guid productId, CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.ProductId == productId, ct);

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
        => await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.SKU == sku.ToUpperInvariant(), ct);

    public async Task<bool> SkuExistsAsync(string sku, CancellationToken ct = default)
        => await _context.Products.AnyAsync(p => p.SKU == sku.ToUpperInvariant(), ct);

    public async Task<List<Product>> GetAllActiveAsync(CancellationToken ct = default)
        => await _context.Products
            .AsNoTracking()
            .Where(p => p.Status == ProductStatus.Active)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> GetAllAsync(CancellationToken ct = default)
        => await _context.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> GetByCategoryAsync(Guid categoryId, CancellationToken ct = default)
    {
        var categoryIds = await GetCategoryAndDescendantIdsAsync(categoryId, ct);

        return await _context.Products
            .AsNoTracking()
            .Where(p => categoryIds.Contains(p.CategoryId) && p.Status == ProductStatus.Active)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
    }

    public async Task<List<Product>> GetAllByCategoryAsync(Guid categoryId, CancellationToken ct = default)
    {
        var categoryIds = await GetCategoryAndDescendantIdsAsync(categoryId, ct);

        return await _context.Products
            .AsNoTracking()
            .Where(p => categoryIds.Contains(p.CategoryId))
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
    }

    private async Task<HashSet<Guid>> GetCategoryAndDescendantIdsAsync(Guid categoryId, CancellationToken ct)
    {
        var categoryRows = await _context.Categories
            .AsNoTracking()
            .Select(c => new { c.CategoryId, c.ParentCategoryId })
            .ToListAsync(ct);

        var ids = new HashSet<Guid> { categoryId };

        var childrenByParent = categoryRows
            .Where(c => c.ParentCategoryId.HasValue)
            .GroupBy(c => c.ParentCategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.CategoryId).ToList());

        var queue = new Queue<Guid>();
        queue.Enqueue(categoryId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (!childrenByParent.TryGetValue(current, out var children))
            {
                continue;
            }

            foreach (var childId in children)
            {
                if (ids.Add(childId))
                {
                    queue.Enqueue(childId);
                }
            }
        }

        return ids;
    }

    public async Task<List<Product>> SearchAsync(string searchTerm, CancellationToken ct = default)
    {
        var term = searchTerm.Trim();
        var escapedTerm = term
            .Replace("[", "[[]")
            .Replace("%", "[%]")
            .Replace("_", "[_]");
        var pattern = $"%{escapedTerm}%";

        return await _context.Products
            .AsNoTracking()
            .Where(p => p.Status == ProductStatus.Active &&
                       (EF.Functions.Like(p.Name, pattern) ||
                        EF.Functions.Like(p.SKU, pattern) ||
                        (p.Brand != null && EF.Functions.Like(p.Brand, pattern))))
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
    }

    public async Task<List<StockSubscription>> GetSubscribersForProductAsync(Guid productId, CancellationToken ct = default)
        => await _context.StockSubscriptions
            .Where(s => s.ProductId == productId)
            .ToListAsync(ct);

    public async Task<StockSubscription?> GetSubscriptionAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
        => await _context.StockSubscriptions
            .FirstOrDefaultAsync(s => s.DealerId == dealerId && s.ProductId == productId, ct);

    public async Task<FavoriteProduct?> GetFavoriteAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
        => await _context.FavoriteProducts
            .FirstOrDefaultAsync(f => f.DealerId == dealerId && f.ProductId == productId, ct);

    public async Task<List<FavoriteProduct>> GetDealerFavoritesAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.FavoriteProducts
            .Include(f => f.Product)
            .Where(f => f.DealerId == dealerId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(Product product, CancellationToken ct = default)
        => await _context.Products.AddAsync(product, ct);

    public Task RemoveAsync(Product product, CancellationToken ct = default)
    {
        _context.Products.Remove(product);
        return Task.CompletedTask;
    }
    public async Task AddSubscriptionAsync(StockSubscription subscription, CancellationToken ct = default)
        => await _context.StockSubscriptions.AddAsync(subscription, ct);

    public async Task AddFavoriteAsync(FavoriteProduct favorite, CancellationToken ct = default)
        => await _context.FavoriteProducts.AddAsync(favorite, ct);

    public Task RemoveSubscriptionAsync(StockSubscription subscription, CancellationToken ct = default)
    {
        _context.StockSubscriptions.Remove(subscription);
        return Task.CompletedTask;
    }

    public Task RemoveFavoriteAsync(FavoriteProduct favorite, CancellationToken ct = default)
    {
        _context.FavoriteProducts.Remove(favorite);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
