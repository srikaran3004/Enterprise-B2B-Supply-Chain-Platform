namespace SupplyChain.Logistics.Application.DTOs;

public record ShipmentDto(
    Guid     ShipmentId,
    Guid     OrderId,
    string   Status,
    string?  AgentName,
    string?  AgentPhone,
    string?  VehicleRegistrationNo,
    DateTime SlaDeadlineUtc,
    bool     SlaAtRisk,
    DateTime? PickedUpAt,
    DateTime? DeliveredAt
);
