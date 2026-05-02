namespace SupplyChain.Logistics.Domain.Events;

public record AgentAssigned(
    Guid ShipmentId,
    Guid OrderId,
    string OrderNumber,
    Guid DealerId,
    string DealerEmail,
    string DealerName,
    Guid AgentId,
    Guid AgentUserId,
    string AgentName,
    string AgentPhone,
    string VehicleNo,
    string AgentEmail,
    string ShippingAddressLine,
    string ShippingCity,
    string ShippingPinCode
);
