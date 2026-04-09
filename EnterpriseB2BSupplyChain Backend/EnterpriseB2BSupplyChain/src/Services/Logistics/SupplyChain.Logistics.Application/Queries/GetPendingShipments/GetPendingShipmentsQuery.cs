using MediatR;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetPendingShipments;

public record GetPendingShipmentsQuery : IRequest<List<ShipmentDto>>;
