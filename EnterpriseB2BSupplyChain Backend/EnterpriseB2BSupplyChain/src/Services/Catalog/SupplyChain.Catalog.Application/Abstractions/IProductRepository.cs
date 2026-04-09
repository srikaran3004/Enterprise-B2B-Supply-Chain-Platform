using System;
using System.Collections.Generic;
using System.Text;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Abstractions
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(Guid productId, CancellationToken ct = default);
        Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
        Task<bool> SkuExistsAsync(string sku, CancellationToken ct = default);
        Task<List<Product>> GetAllActiveAsync(CancellationToken ct = default);
        Task<List<Product>> GetAllAsync(CancellationToken ct = default);
        Task<List<Product>> GetByCategoryAsync(Guid categoryId, CancellationToken ct = default);
        /// <summary>Returns ALL products in a category regardless of status (active + inactive).</summary>
        Task<List<Product>> GetAllByCategoryAsync(Guid categoryId, CancellationToken ct = default);
        Task<List<Product>> SearchAsync(string searchTerm, CancellationToken ct = default);

        Task<List<StockSubscription>> GetSubscribersForProductAsync(Guid productId, CancellationToken ct = default);
        Task<StockSubscription?> GetSubscriptionAsync(Guid dealerId, Guid productId, CancellationToken ct = default);

        Task<FavoriteProduct?> GetFavoriteAsync(Guid dealerId, Guid productId, CancellationToken ct = default);
        Task<List<FavoriteProduct>> GetDealerFavoritesAsync(Guid dealerId, CancellationToken ct = default);

        Task AddAsync(Product product, CancellationToken ct = default);
        Task RemoveAsync(Product product, CancellationToken ct = default);
        Task AddSubscriptionAsync(StockSubscription subscription, CancellationToken ct = default);
        Task AddFavoriteAsync(FavoriteProduct favorite, CancellationToken ct = default);
        Task RemoveSubscriptionAsync(StockSubscription subscription, CancellationToken ct = default);
        Task RemoveFavoriteAsync(FavoriteProduct favorite, CancellationToken ct = default);
        Task SaveChangesAsync(CancellationToken ct = default);
    }
}