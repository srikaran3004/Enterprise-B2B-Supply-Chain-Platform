using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetAllShipments;

public class GetAllShipmentsQueryHandler : IRequestHandler<GetAllShipmentsQuery, List<ShipmentDto>>
{
    private readonly IShipmentRepository _shipmentRepository;

    public GetAllShipmentsQueryHandler(IShipmentRepository shipmentRepository)
        => _shipmentRepository = shipmentRepository;

    public async Task<List<ShipmentDto>> Handle(GetAllShipmentsQuery query, CancellationToken ct)
    {
        var shipments = await _shipmentRepository.GetAllAsync(ct);

        return shipments.Select(s => new ShipmentDto(
            ShipmentId:            s.ShipmentId,
            OrderId:               s.OrderId,
            Status:                s.Status.ToString(),
            AgentName:             s.Agent?.FullName,
            AgentPhone:            s.Agent?.Phone,
            VehicleRegistrationNo: s.Vehicle?.RegistrationNo,
            SlaDeadlineUtc:        s.SlaDeadlineUtc,
            SlaAtRisk:             s.IsSlaAtRisk(),
            PickedUpAt:            s.PickedUpAt,
            DeliveredAt:           s.DeliveredAt
        )).ToList();
    }
}
