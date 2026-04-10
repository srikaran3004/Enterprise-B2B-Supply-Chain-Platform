using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Events;
using SupplyChain.SharedInfrastructure.Contracts;
using SupplyChain.SharedInfrastructure.Correlation;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class AgentAssignedEventPublisher : IAgentAssignedEventPublisher
{
    private readonly IConnection _rabbitConnection;
    private readonly ICorrelationIdAccessor _correlationIdAccessor;

    public AgentAssignedEventPublisher(
        IConnection rabbitConnection,
        ICorrelationIdAccessor correlationIdAccessor)
    {
        _rabbitConnection = rabbitConnection;
        _correlationIdAccessor = correlationIdAccessor;
    }

    public async Task PublishAsync(AgentAssigned @event, CancellationToken ct)
    {
        var payload = new
        {
            @event.ShipmentId,
            @event.OrderId,
            @event.OrderNumber,
            @event.DealerId,
            @event.DealerEmail,
            @event.AgentId,
            @event.AgentUserId,
            @event.AgentName,
            @event.AgentPhone,
            @event.VehicleNo,
            @event.AgentEmail,
            @event.ShippingAddressLine,
            @event.ShippingCity,
            @event.ShippingPinCode
        };

        var envelope = new EventEnvelope<object>(
            EventId: Guid.NewGuid(),
            EventType: "AgentAssigned",
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
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = new Dictionary<string, object?>
            {
                ["EventType"] = "AgentAssigned",
                ["ServiceSource"] = "LogisticsService",
                ["CorrelationId"] = _correlationIdAccessor.CorrelationId
            }
        };

        await channel.BasicPublishAsync(
            exchange: "supplychain.domain.events",
            routingKey: "agent.assigned",
            mandatory: false,
            basicProperties: props,
            body: body,
            cancellationToken: ct);
    }
}
