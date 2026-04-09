using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Commands.SubscribeToProduct;

public class SubscribeToProductCommandHandler : IRequestHandler<SubscribeToProductCommand>
{
    private readonly IProductRepository _productRepository;

    public SubscribeToProductCommandHandler(IProductRepository productRepository)
        => _productRepository = productRepository;

    public async Task Handle(SubscribeToProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        var existing = await _productRepository.GetSubscriptionAsync(command.DealerId, command.ProductId, ct);
        if (existing is not null)
            return;

        var subscription = StockSubscription.Create(command.DealerId, command.ProductId);
        await _productRepository.AddSubscriptionAsync(subscription, ct);
        await _productRepository.SaveChangesAsync(ct);
    }
}
