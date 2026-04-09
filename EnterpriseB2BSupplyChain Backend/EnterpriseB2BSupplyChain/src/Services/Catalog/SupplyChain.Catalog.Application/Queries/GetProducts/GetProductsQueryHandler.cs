using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetProducts;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, List<ProductDto>>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public GetProductsQueryHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task<List<ProductDto>> Handle(GetProductsQuery query, CancellationToken ct)
    {
        var cacheKey = $"catalog:products:cat={query.CategoryId}:stock={query.InStockOnly}:q={query.SearchTerm}:inactive={query.IncludeInactive}";

        // Skip cache when including inactive so admin always gets fresh data
        if (!query.IncludeInactive)
        {
            var cached = await _cache.GetAsync<List<ProductDto>>(cacheKey, ct);
            if (cached is not null)
                return cached;
        }

        List<Domain.Entities.Product> products;

        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            products = await _productRepository.SearchAsync(query.SearchTerm, ct);
        else if (query.CategoryId.HasValue)
            products = await _productRepository.GetByCategoryAsync(query.CategoryId.Value, ct);
        else if (query.IncludeInactive)
            products = await _productRepository.GetAllAsync(ct);
        else
            products = await _productRepository.GetAllActiveAsync(ct);

        if (query.InStockOnly == true)
            products = products.Where(p => p.IsInStock).ToList();

        var result = products.Select(p => new ProductDto(
            ProductId: p.ProductId,
            CategoryId: p.CategoryId,
            SKU: p.SKU,
            Name: p.Name,
            Brand: p.Brand,
            CategoryName: p.Category.Name,
            UnitPrice: p.UnitPrice,
            MinOrderQuantity: p.MinOrderQuantity,
            TotalStock: p.TotalStock,
            ReservedStock: p.ReservedStock,
            AvailableStock: p.AvailableStock,
            IsInStock: p.IsInStock,
            Status: p.Status.ToString(),
            ImageUrl: p.ImageUrl
        )).ToList();

        // Fetch all soft-lock quantities in parallel to avoid N sequential Redis round-trips
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

        if (!query.IncludeInactive)
            await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5), ct);

        return result;
    }
}