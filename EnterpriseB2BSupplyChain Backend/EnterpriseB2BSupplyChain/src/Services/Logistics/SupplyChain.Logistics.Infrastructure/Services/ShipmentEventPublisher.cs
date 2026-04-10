using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Contracts;
using SupplyChain.SharedInfrastructure.Correlation;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class ShipmentEventPublisher : IShipmentEventPublisher
{
    private readonly IConnection _rabbitConnection;
    private readonly ICorrelationIdAccessor _correlationIdAccessor;

    public ShipmentEventPublisher(
        IConnection rabbitConnection,
        ICorrelationIdAccessor correlationIdAccessor)
    {
        _rabbitConnection = rabbitConnection;
        _correlationIdAccessor = correlationIdAccessor;
    }

    public async Task PublishAsync(ShipmentStatusEvent @event, CancellationToken ct)
    {
        var payload = new
        {
            @event.ShipmentId,
            @event.OrderId,
            @event.OrderNumber,
            @event.DealerId,
            @event.DealerEmail,
            @event.DealerName,
            @event.AgentId,
            @event.AgentUserId,
            @event.AgentName,
            @event.AgentPhone,
            @event.VehicleRegistrationNo,
            @event.VehicleType,
            @event.Status,
            @event.UpdatedAt,
            @event.Place,
            @event.Notes,
            RecordedAt = @event.UpdatedAt
        };

        var envelope = new EventEnvelope<object>(
            EventId: Guid.NewGuid(),
            EventType: @event.EventType,
            OccurredAt: DateTime.UtcNow,
            CorrelationId: _correlationIdAccessor.CorrelationId,
            Source: "logistics-service",
            Payload: payload);

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope));
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
                ["ServiceSource"] = "LogisticsService",
                ["CorrelationId"] = _correlationIdAccessor.CorrelationId
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
