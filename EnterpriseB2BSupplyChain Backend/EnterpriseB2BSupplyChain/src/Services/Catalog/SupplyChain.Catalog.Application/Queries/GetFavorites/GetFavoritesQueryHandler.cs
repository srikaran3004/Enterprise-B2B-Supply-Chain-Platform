using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetFavorites;

public class GetFavoritesQueryHandler : IRequestHandler<GetFavoritesQuery, List<ProductDto>>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public GetFavoritesQueryHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task<List<ProductDto>> Handle(GetFavoritesQuery query, CancellationToken ct)
    {
        var favorites = await _productRepository.GetDealerFavoritesAsync(query.DealerId, ct);

        var result = favorites
            .Where(f => f.Product != null)
            .Select(f => new ProductDto(
                ProductId:        f.Product!.ProductId,
                CategoryId:       f.Product.CategoryId,
                SKU:              f.Product.SKU,
                Name:             f.Product.Name,
                Brand:            f.Product.Brand,
                CategoryName:     f.Product.Category?.Name ?? string.Empty,
                UnitPrice:        f.Product.UnitPrice,
                MinOrderQuantity: f.Product.MinOrderQuantity,
                TotalStock:       f.Product.TotalStock,
                ReservedStock:    f.Product.ReservedStock,
                AvailableStock:   f.Product.AvailableStock,
                IsInStock:        f.Product.IsInStock,
                Status:           f.Product.Status.ToString(),
                ImageUrl:         f.Product.ImageUrl
            )).ToList();

        // Fetch all soft-lock quantities in parallel
        var softLocks = await Task.WhenAll(
            result.Select(dto => _cache.GetSoftLockedQuantityAsync(dto.ProductId, ct)));

        for (int i = 0; i < result.Count; i++)
        {
            var r = softLocks[i];
            if (r > 0)
            {
                var dto = result[i];
                var newReserved  = dto.ReservedStock + r;
                var newAvailable = dto.TotalStock - newReserved;
                result[i] = dto with
                {
                    ReservedStock  = newReserved,
                    AvailableStock = newAvailable,
                    IsInStock      = newAvailable >= dto.MinOrderQuantity
                };
            }
        }

        return result;
    }
}
