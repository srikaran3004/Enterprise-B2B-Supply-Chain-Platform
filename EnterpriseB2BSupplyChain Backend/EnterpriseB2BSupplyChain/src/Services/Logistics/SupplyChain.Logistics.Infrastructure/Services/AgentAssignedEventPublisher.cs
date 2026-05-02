using System.Text.Json;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Domain.Events;

namespace SupplyChain.Logistics.Infrastructure.Services;

/// <summary>
/// Writes an AgentAssigned event to the local OutboxMessages table instead of
/// publishing directly to RabbitMQ. The OutboxPollerJob delivers it reliably
/// with at-least-once semantics, even if the broker is temporarily unavailable.
/// </summary>
public class AgentAssignedEventPublisher : IAgentAssignedEventPublisher
{
    private readonly IOutboxRepository _outboxRepository;

    public AgentAssignedEventPublisher(IOutboxRepository outboxRepository)
        => _outboxRepository = outboxRepository;

    public async Task PublishAsync(AgentAssigned @event, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
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
            @event.VehicleNo,
            @event.AgentEmail,
            @event.ShippingAddressLine,
            @event.ShippingCity,
            @event.ShippingPinCode
        });

        var message = OutboxMessage.Create("AgentAssigned", payload);
        await _outboxRepository.AddAsync(message, ct);
        // SaveChanges is the caller's responsibility (unit-of-work pattern).
    }
}
