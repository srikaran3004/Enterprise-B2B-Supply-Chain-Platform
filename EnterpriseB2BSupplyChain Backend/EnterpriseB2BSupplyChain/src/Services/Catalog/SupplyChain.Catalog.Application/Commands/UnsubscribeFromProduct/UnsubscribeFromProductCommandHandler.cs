using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.UnsubscribeFromProduct;

public class UnsubscribeFromProductCommandHandler : IRequestHandler<UnsubscribeFromProductCommand>
{
    private readonly IProductRepository _productRepository;

    public UnsubscribeFromProductCommandHandler(IProductRepository productRepository)
        => _productRepository = productRepository;

    public async Task Handle(UnsubscribeFromProductCommand command, CancellationToken ct)
    {
        var subscription = await _productRepository
            .GetSubscriptionAsync(command.DealerId, command.ProductId, ct);

        if (subscription is null)
            return;

        await _productRepository.RemoveSubscriptionAsync(subscription, ct);
        await _productRepository.SaveChangesAsync(ct);
    }
}
