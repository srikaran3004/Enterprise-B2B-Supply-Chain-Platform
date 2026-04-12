namespace SupplyChain.Catalog.Application.Abstractions;

public interface IStockRestoredEventPublisher
{
    Task PublishAsync(
        Guid dealerId,
        string recipientEmail,
        string dealerName,
        Guid productId,
        string productName,
        string sku,
        int availableQuantity,
        CancellationToken ct);
}
