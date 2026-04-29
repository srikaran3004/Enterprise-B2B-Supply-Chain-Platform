using System.Text.Json;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Services;

/// <summary>
/// Writes a StockRestored event to the local OutboxMessages table instead of
/// publishing directly to RabbitMQ. The OutboxPollerJob (Hangfire) picks it up
/// and delivers it reliably, guaranteeing at-least-once delivery even if the
/// broker is temporarily unavailable.
/// </summary>
public class StockRestoredEventPublisher : IStockRestoredEventPublisher
{
    private readonly IOutboxRepository _outboxRepository;

    public StockRestoredEventPublisher(IOutboxRepository outboxRepository)
        => _outboxRepository = outboxRepository;

    public async Task PublishAsync(
        Guid dealerId,
        string recipientEmail,
        string dealerName,
        Guid productId,
        string productName,
        string sku,
        int availableQuantity,
        CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            dealerId,
            recipientEmail,
            dealer_name   = string.IsNullOrWhiteSpace(dealerName) ? "Dealer" : dealerName,
            productId,
            product_name  = productName,
            sku,
            available_qty = availableQuantity
        });

        var message = OutboxMessage.Create("StockRestored", payload);
        await _outboxRepository.AddAsync(message, ct);
        // SaveChanges is the caller's responsibility (unit-of-work pattern).
        // The caller (application command handler) already calls SaveChangesAsync
        // on the same DbContext scope, so the outbox row is committed atomically
        // with the stock-restored domain change.
    }
}
