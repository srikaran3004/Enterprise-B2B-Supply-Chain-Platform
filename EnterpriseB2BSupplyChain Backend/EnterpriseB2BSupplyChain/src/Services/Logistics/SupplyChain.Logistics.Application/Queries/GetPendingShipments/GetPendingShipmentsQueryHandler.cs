using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetPendingShipments;

public class GetPendingShipmentsQueryHandler : IRequestHandler<GetPendingShipmentsQuery, List<ShipmentDto>>
{
    private readonly IShipmentRepository _shipmentRepository;

    public GetPendingShipmentsQueryHandler(IShipmentRepository shipmentRepository)
        => _shipmentRepository = shipmentRepository;

    public async Task<List<ShipmentDto>> Handle(GetPendingShipmentsQuery query, CancellationToken ct)
    {
        // Return ALL active shipments (Pending through OutForDelivery) so the
        // Logistics dashboard, Pending Dispatch page, and SLA Monitor all see
        // the full live picture — not just unassigned ones.
        var shipments = await _shipmentRepository.GetAllActiveAsync(ct);

        return shipments.Select(s => new ShipmentDto(
            ShipmentId:           s.ShipmentId,
            OrderId:              s.OrderId,
            Status:               s.Status.ToString(),
            AgentName:            s.Agent?.FullName,
            AgentPhone:           s.Agent?.Phone,
            VehicleRegistrationNo:s.Vehicle?.RegistrationNo,
            SlaDeadlineUtc:       s.SlaDeadlineUtc,
            SlaAtRisk:            s.IsSlaAtRisk(),
            PickedUpAt:           s.PickedUpAt,
            DeliveredAt:          s.DeliveredAt
        )).ToList();
    }
}
