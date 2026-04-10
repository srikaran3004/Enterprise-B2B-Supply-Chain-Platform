using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Views;

public record ShipmentDashboardView(
    Guid ShipmentId,
    Guid OrderId,
    string Status,
    string? AgentName,
    string? AgentPhone,
    string? VehicleRegistrationNo,
    DateTime SlaDeadlineUtc,
    bool SlaAtRisk,
    DateTime? PickedUpAt,
    DateTime? DeliveredAt
)
{
    public static ShipmentDashboardView FromDto(ShipmentDto dto) =>
        new(
            dto.ShipmentId,
            dto.OrderId,
            dto.Status,
            dto.AgentName,
            dto.AgentPhone,
            dto.VehicleRegistrationNo,
            dto.SlaDeadlineUtc,
            dto.SlaAtRisk,
            dto.PickedUpAt,
            dto.DeliveredAt
        );
}

