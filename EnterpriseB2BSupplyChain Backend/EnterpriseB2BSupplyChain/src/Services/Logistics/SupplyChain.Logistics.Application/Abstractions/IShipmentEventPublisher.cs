namespace SupplyChain.Logistics.Application.Abstractions;

public record ShipmentStatusEvent(
    Guid    ShipmentId,
    Guid    OrderId,
    string  OrderNumber,
    Guid    DealerId,
    string  DealerEmail,
    string  DealerName,
    Guid    AgentId,
    Guid    AgentUserId,
    string  AgentName,
    string  AgentPhone,
    string? VehicleRegistrationNo,
    string? VehicleType,
    string  EventType,
    string  Status,
    DateTime UpdatedAt,
    string? Place     = null,
    string? Notes     = null
);

public interface IShipmentEventPublisher
{
    Task PublishAsync(ShipmentStatusEvent @event, CancellationToken ct);
}
