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
            .FirstOrDefaultAsync(p => p.ProductId == productId, ct);

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.SKU == sku.ToUpperInvariant(), ct);

    public async Task<bool> SkuExistsAsync(string sku, CancellationToken ct = default)
        => await _context.Products.AnyAsync(p => p.SKU == sku.ToUpperInvariant(), ct);

    public async Task<List<Product>> GetAllActiveAsync(CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .Where(p => p.Status == ProductStatus.Active)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> GetAllAsync(CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> GetByCategoryAsync(Guid categoryId, CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .Where(p => p.CategoryId == categoryId && p.Status == ProductStatus.Active)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> GetAllByCategoryAsync(Guid categoryId, CancellationToken ct = default)
        => await _context.Products
            .Include(p => p.Category)
            .Where(p => p.CategoryId == categoryId)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task<List<Product>> SearchAsync(string searchTerm, CancellationToken ct = default)
    {
        var term = searchTerm.ToLower();
        return await _context.Products
            .Include(p => p.Category)
            .Where(p => p.Status == ProductStatus.Active &&
                       (p.Name.ToLower().Contains(term) ||
                        p.SKU.ToLower().Contains(term) ||
                        (p.Brand != null && p.Brand.ToLower().Contains(term))))
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
