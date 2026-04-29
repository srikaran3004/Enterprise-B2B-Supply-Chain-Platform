using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.HardDeleteProduct;

public class HardDeleteProductCommandHandler : IRequestHandler<HardDeleteProductCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public HardDeleteProductCommandHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task Handle(HardDeleteProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        // Soft delete: mark as deleted instead of physically removing the row.
        // The global EF query filter (!IsDeleted) will exclude it from all future queries.
        product.SoftDelete();
        await _productRepository.SaveChangesAsync(ct);

        // Invalidate all product cache entries
        await _cache.RemoveAsync($"catalog:product:{command.ProductId}", ct);
        await _cache.RemoveByPatternAsync("catalog:products:*", ct);
        await _cache.RemoveByPatternAsync("catalog:products:v2:*", ct);
    }
}
