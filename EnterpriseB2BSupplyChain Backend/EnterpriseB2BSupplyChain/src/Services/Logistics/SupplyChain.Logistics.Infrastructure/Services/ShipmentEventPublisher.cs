using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class ShipmentEventPublisher : IShipmentEventPublisher
{
    private readonly IConnection _rabbitConnection;

    public ShipmentEventPublisher(IConnection rabbitConnection)
        => _rabbitConnection = rabbitConnection;

    public async Task PublishAsync(ShipmentStatusEvent @event, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            @event.ShipmentId,
            @event.OrderId,
            @event.OrderNumber,
            @event.DealerId,
            @event.DealerEmail,
            @event.AgentId,
            @event.AgentName,
            @event.AgentPhone,
            @event.Status,
            @event.Place,
            @event.Notes,
            RecordedAt = DateTime.UtcNow
        });

        var body = Encoding.UTF8.GetBytes(payload);
        await using var channel = await _rabbitConnection.CreateChannelAsync(cancellationToken: ct);

        await channel.ExchangeDeclareAsync(
            exchange: "supplychain.domain.events",
            type: ExchangeType.Topic,
            durable: true,
            cancellationToken: ct);

        var props = new BasicProperties
        {
            ContentType  = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = new Dictionary<string, object?>
            {
                ["EventType"]     = @event.EventType,
                ["ServiceSource"] = "LogisticsService"
            }
        };

        var routingKey = @event.EventType switch
        {
            "VehicleBreakdown"       => "shipment.breakdown",
            "OrderDelivered"         => "shipment.delivered",
            "ShipmentStatusUpdated"  => "shipment.status",
            _                        => "shipment.event"
        };

        await channel.BasicPublishAsync(
            exchange:        "supplychain.domain.events",
            routingKey:      routingKey,
            mandatory:       false,
            basicProperties: props,
            body:            body,
            cancellationToken: ct);
    }
}
