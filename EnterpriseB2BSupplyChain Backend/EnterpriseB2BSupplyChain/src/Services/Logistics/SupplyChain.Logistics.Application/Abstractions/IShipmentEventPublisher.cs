namespace SupplyChain.Logistics.Application.Abstractions;

public record ShipmentStatusEvent(
    Guid    ShipmentId,
    Guid    OrderId,
    string  OrderNumber,
    Guid    DealerId,
    string  DealerEmail,
    Guid    AgentId,
    string  AgentName,
    string  AgentPhone,
    string  EventType,
    string  Status,
    string? Place     = null,
    string? Notes     = null
);

public interface IShipmentEventPublisher
{
    Task PublishAsync(ShipmentStatusEvent @event, CancellationToken ct);
}
