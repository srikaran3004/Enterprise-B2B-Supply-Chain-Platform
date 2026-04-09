using MediatR;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetAllShipments;

public record GetAllShipmentsQuery : IRequest<List<ShipmentDto>>;
