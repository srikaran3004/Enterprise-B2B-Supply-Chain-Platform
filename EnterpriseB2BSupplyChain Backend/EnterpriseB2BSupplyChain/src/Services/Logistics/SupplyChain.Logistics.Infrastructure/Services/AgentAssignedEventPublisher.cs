using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Events;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class AgentAssignedEventPublisher : IAgentAssignedEventPublisher
{
    private readonly IConnection _rabbitConnection;

    public AgentAssignedEventPublisher(IConnection rabbitConnection)
        => _rabbitConnection = rabbitConnection;

    public async Task PublishAsync(AgentAssigned @event, CancellationToken ct)
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
            @event.VehicleNo,
            @event.AgentEmail,
            @event.ShippingAddressLine,
            @event.ShippingCity,
            @event.ShippingPinCode
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
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = new Dictionary<string, object?>
            {
                ["EventType"] = "AgentAssigned",
                ["ServiceSource"] = "LogisticsService"
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
