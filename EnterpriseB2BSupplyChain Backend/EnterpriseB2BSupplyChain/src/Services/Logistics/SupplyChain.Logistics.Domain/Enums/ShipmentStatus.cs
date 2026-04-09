namespace SupplyChain.Logistics.Domain.Enums;

public enum ShipmentStatus
{
    Pending,
    AgentAssigned,
    PickedUp,
    InTransit,
    OutForDelivery,
    Delivered,
    Failed,
    VehicleBreakdown
}
