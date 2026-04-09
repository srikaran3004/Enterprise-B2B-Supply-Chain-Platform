using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetProductById;

public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, ProductDetailDto>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public GetProductByIdQueryHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task<ProductDetailDto> Handle(GetProductByIdQuery query, CancellationToken ct)
    {
        var cacheKey = $"catalog:product:{query.ProductId}";

        var cached = await _cache.GetAsync<ProductDetailDto>(cacheKey, ct);
        if (cached is not null)
            return cached;

        var product = await _productRepository.GetByIdAsync(query.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {query.ProductId} not found.");

        var reservedStock = product.ReservedStock + await _cache.GetSoftLockedQuantityAsync(product.ProductId, ct);
        reservedStock = Math.Min(product.TotalStock, Math.Max(0, reservedStock));
        var availableStock = Math.Max(0, product.TotalStock - reservedStock);

        var result = new ProductDetailDto(
            ProductId: product.ProductId,
            SKU: product.SKU,
            Name: product.Name,
            Description: product.Description,
            Brand: product.Brand,
            CategoryId: product.CategoryId,
            CategoryName: product.Category.Name,
            UnitPrice: product.UnitPrice,
            MinOrderQuantity: product.MinOrderQuantity,
            TotalStock: product.TotalStock,
            ReservedStock: reservedStock,
            AvailableStock: availableStock,
            IsInStock: availableStock >= product.MinOrderQuantity,
            Status: product.Status.ToString(),
            ImageUrl: product.ImageUrl,
            CreatedAt: product.CreatedAt,
            UpdatedAt: product.UpdatedAt
        );

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5), ct);
        return result;
    }
}
