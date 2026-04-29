using System.Text.Json;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;
namespace SupplyChain.Logistics.Infrastructure.Services;

/// <summary>
/// Writes a shipment status event to the local OutboxMessages table instead of
/// publishing directly to RabbitMQ. The OutboxPollerJob delivers it reliably
/// with at-least-once semantics, even if the broker is temporarily unavailable.
/// </summary>
public class ShipmentEventPublisher : IShipmentEventPublisher
{
    private readonly IOutboxRepository _outboxRepository;

    public ShipmentEventPublisher(IOutboxRepository outboxRepository)
        => _outboxRepository = outboxRepository;

    public async Task PublishAsync(ShipmentStatusEvent @event, CancellationToken ct)
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
            @event.VehicleRegistrationNo,
            @event.VehicleType,
            @event.Status,
            @event.UpdatedAt,
            @event.Place,
            @event.Notes,
            RecordedAt = @event.UpdatedAt
        });

        var message = OutboxMessage.Create(@event.EventType, payload);
        await _outboxRepository.AddAsync(message, ct);
        // SaveChanges is the caller's responsibility (unit-of-work pattern).
    }
}
