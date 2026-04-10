using MediatR;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Application.Commands.UpdateShipmentStatus;

public record UpdateShipmentStatusCommand(
    Guid           OrderId,
    Guid           AgentId,
    string?        AgentFullName,
    ShipmentStatus NewStatus,
    decimal?       Latitude  = null,
    decimal?       Longitude = null,
    string?        Notes     = null,
    string?        Place     = null
) : IRequest;
