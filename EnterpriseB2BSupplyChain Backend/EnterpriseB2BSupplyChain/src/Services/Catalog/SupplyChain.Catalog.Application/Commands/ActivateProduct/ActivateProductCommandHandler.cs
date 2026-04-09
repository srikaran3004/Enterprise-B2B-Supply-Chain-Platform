using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.ActivateProduct;

public class ActivateProductCommandHandler : IRequestHandler<ActivateProductCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public ActivateProductCommandHandler(IProductRepository productRepository, ICacheService cache)
    {
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task Handle(ActivateProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        product.Activate();
        await _productRepository.SaveChangesAsync(ct);

        await _cache.RemoveAsync($"catalog:product:{command.ProductId}", ct);
        await _cache.RemoveByPatternAsync("catalog:products:*", ct);
    }
}
