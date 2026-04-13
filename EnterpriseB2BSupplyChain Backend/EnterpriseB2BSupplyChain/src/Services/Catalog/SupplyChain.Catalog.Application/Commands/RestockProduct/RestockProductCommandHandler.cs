using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.RestockProduct;

public class RestockProductCommandHandler : IRequestHandler<RestockProductCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;
    private readonly IIdentityServiceClient _identityServiceClient;
    private readonly IStockRestoredEventPublisher _stockRestoredEventPublisher;

    public RestockProductCommandHandler(
        IProductRepository productRepository,
        ICacheService cache,
        IIdentityServiceClient identityServiceClient,
        IStockRestoredEventPublisher stockRestoredEventPublisher)
    {
        _productRepository = productRepository;
        _cache = cache;
        _identityServiceClient = identityServiceClient;
        _stockRestoredEventPublisher = stockRestoredEventPublisher;
    }

    public async Task Handle(RestockProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        product.AddStock(command.Quantity);
        await _productRepository.SaveChangesAsync(ct);

        // Notify "Notify Me" subscribers only when the product becomes available again.
        if (product.AvailableStock > 0)
        {
            var subscribers = await _productRepository.GetSubscribersForProductAsync(product.ProductId, ct);

            foreach (var subscriber in subscribers)
            {
                var contact = await _identityServiceClient.GetDealerContactAsync(subscriber.DealerId, ct);
                if (contact is null || string.IsNullOrWhiteSpace(contact.Email))
                    continue;

                await _stockRestoredEventPublisher.PublishAsync(
                    subscriber.DealerId,
                    contact.Email,
                    contact.FullName,
                    product.ProductId,
                    product.Name,
                    product.SKU,
                    product.AvailableStock,
                    ct);

                subscriber.MarkNotified();
            }

            if (subscribers.Count > 0)
                await _productRepository.SaveChangesAsync(ct);
        }

        await _cache.RemoveAsync($"catalog:product:{command.ProductId}", ct);
        await _cache.RemoveByPatternAsync("catalog:products:*", ct);
        await _cache.RemoveByPatternAsync("catalog:products:v2:*", ct);
    }
}
