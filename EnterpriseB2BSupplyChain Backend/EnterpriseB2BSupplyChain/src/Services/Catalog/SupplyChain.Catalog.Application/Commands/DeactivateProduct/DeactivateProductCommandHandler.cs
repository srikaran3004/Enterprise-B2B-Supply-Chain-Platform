using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.DeactivateProduct;

public class DeactivateProductCommandHandler : IRequestHandler<DeactivateProductCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public DeactivateProductCommandHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task Handle(DeactivateProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        product.Deactivate();
        await _productRepository.SaveChangesAsync(ct);

        await _cache.RemoveAsync($"catalog:product:{command.ProductId}", ct);
        await _cache.RemoveByPatternAsync("catalog:products:*", ct);
    }
}
