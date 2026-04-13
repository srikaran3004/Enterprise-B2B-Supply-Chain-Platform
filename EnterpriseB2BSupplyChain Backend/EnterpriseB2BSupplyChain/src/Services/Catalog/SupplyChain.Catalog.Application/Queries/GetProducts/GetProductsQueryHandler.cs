using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetProducts;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, List<ProductDto>>
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICacheService _cache;

    public GetProductsQueryHandler(IProductRepository productRepository, ICategoryRepository categoryRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _cache = cache;
    }

    public async Task<List<ProductDto>> Handle(GetProductsQuery query, CancellationToken ct)
    {
        var cacheKey = $"catalog:products:v2:cat={query.CategoryId}:stock={query.InStockOnly}:q={query.SearchTerm}:inactive={query.IncludeInactive}";

        var cached = await _cache.GetAsync<List<ProductDto>>(cacheKey, ct);
        if (cached is not null)
        {
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

        var categoryLookup = (await _categoryRepository.GetAllAsync(ct))
            .GroupBy(c => c.CategoryId)
            .ToDictionary(g => g.Key, g => g.First().Name);

        var result = products.Select(p => new ProductDto(
            ProductId: p.ProductId,
            CategoryId: p.CategoryId,
            SKU: p.SKU,
            Name: p.Name,
            Brand: p.Brand,
            CategoryName: categoryLookup.TryGetValue(p.CategoryId, out var categoryName) ? categoryName : "Uncategorized",
            UnitPrice: p.UnitPrice,
            MinOrderQuantity: p.MinOrderQuantity,
            TotalStock: p.TotalStock,
            ReservedStock: p.ReservedStock,
            AvailableStock: p.AvailableStock,
            IsInStock: p.IsInStock,
            Status: p.Status.ToString(),
            ImageUrl: p.ImageUrl
        )).ToList();

        // Admin includeInactive views are used for management screens and do not require
        // high-cost real-time soft-lock reconciliation for every item.
        if (!query.IncludeInactive)
        {
            var softLocks = await Task.WhenAll(
                result.Select(dto => _cache.GetSoftLockedQuantityAsync(dto.ProductId, ct)));

            for (int i = 0; i < result.Count; i++)
            {
                var r = softLocks[i];
                if (r > 0)
                {
                    var dto = result[i];
                    var newReserved = dto.ReservedStock + r;
                    var newAvailable = dto.TotalStock - newReserved;
                    result[i] = dto with
                    {
                        ReservedStock = newReserved,
                        AvailableStock = newAvailable,
                        IsInStock = newAvailable >= dto.MinOrderQuantity
                    };
                }
            }
        }

        var ttl = query.IncludeInactive ? TimeSpan.FromMinutes(1) : TimeSpan.FromMinutes(5);
        await _cache.SetAsync(cacheKey, result, ttl, ct);

        return result;
    }
}