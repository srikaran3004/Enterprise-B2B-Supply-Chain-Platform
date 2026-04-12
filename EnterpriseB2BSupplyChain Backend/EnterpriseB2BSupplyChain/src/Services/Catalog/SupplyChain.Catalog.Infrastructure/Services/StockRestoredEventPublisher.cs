using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class StockRestoredEventPublisher : IStockRestoredEventPublisher
{
    private readonly IConnection _rabbitConnection;

    public StockRestoredEventPublisher(IConnection rabbitConnection)
        => _rabbitConnection = rabbitConnection;

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
        var payload = new
        {
            dealerId,
            recipientEmail,
            dealer_name = string.IsNullOrWhiteSpace(dealerName) ? "Dealer" : dealerName,
            productId,
            product_name = productName,
            sku,
            available_qty = availableQuantity
        };

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
        await using var channel = await _rabbitConnection.CreateChannelAsync(cancellationToken: ct);

        await channel.ExchangeDeclareAsync(
            exchange: "supplychain.domain.events",
            type: ExchangeType.Topic,
            durable: true,
            cancellationToken: ct);

        var props = new BasicProperties
        {
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = new Dictionary<string, object?>
            {
                ["EventType"] = "StockRestored",
                ["ServiceSource"] = "CatalogService"
            }
        };

        await channel.BasicPublishAsync(
            exchange: "supplychain.domain.events",
            routingKey: "catalog.stock.restored",
            mandatory: false,
            basicProperties: props,
            body: body,
            cancellationToken: ct);
    }
}
