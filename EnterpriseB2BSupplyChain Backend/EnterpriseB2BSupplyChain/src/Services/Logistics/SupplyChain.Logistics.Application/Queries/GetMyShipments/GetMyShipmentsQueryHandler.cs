using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetMyShipments;

public record GetMyShipmentsQuery(Guid AgentUserId) : IRequest<List<AgentShipmentDto>>;

public record TrackingEventDto(
    string   Status,
    string?  Notes,
    string?  Place,
    DateTime RecordedAt
);

public record AgentShipmentDto(
    Guid             ShipmentId,
    Guid             OrderId,
    string           Status,
    string?          DealerName,
    string?          DealerPhone,
    string?          ShippingAddress,
    string?          ShippingCity,
    string?          ShippingState,
    string?          ShippingPinCode,
    string?          VehicleRegistrationNo,
    string?          VehicleType,
    DateTime         SlaDeadlineUtc,
    bool             SlaAtRisk,
    DateTime?        PickedUpAt,
    DateTime?        DeliveredAt,
    List<TrackingEventDto> TrackingHistory
);

public class GetMyShipmentsQueryHandler : IRequestHandler<GetMyShipmentsQuery, List<AgentShipmentDto>>
{
    private readonly IShipmentRepository  _shipmentRepository;
    private readonly IAgentRepository     _agentRepository;
    private readonly IOrderServiceClient  _orderServiceClient;

    public GetMyShipmentsQueryHandler(
        IShipmentRepository shipmentRepository,
        IAgentRepository    agentRepository,
        IOrderServiceClient orderServiceClient)
    {
        _shipmentRepository = shipmentRepository;
        _agentRepository    = agentRepository;
        _orderServiceClient = orderServiceClient;
    }

    public async Task<List<AgentShipmentDto>> Handle(GetMyShipmentsQuery query, CancellationToken ct)
    {
        // Find agent by user ID
        var agents = await _agentRepository.GetAllAsync(ct);
        var agent  = agents.FirstOrDefault(a => a.UserId == query.AgentUserId);

        if (agent is null)
            return new List<AgentShipmentDto>();

        var shipments = await _shipmentRepository.GetByAgentIdAsync(agent.AgentId, ct);

        var result = new List<AgentShipmentDto>();
        foreach (var s in shipments)
        {
            OrderNotificationDetailsDto? orderDetails = null;
            try
            {
                orderDetails = await _orderServiceClient.GetOrderNotificationDetailsAsync(s.OrderId, ct);
            }
            catch { /* non-critical */ }

            var tracking = s.TrackingEvents
                .OrderBy(e => e.RecordedAt)
                .Select(e => new TrackingEventDto(e.Status, e.Notes, e.Place, e.RecordedAt))
                .ToList();

            result.Add(new AgentShipmentDto(
                ShipmentId:            s.ShipmentId,
                OrderId:               s.OrderId,
                Status:                s.Status.ToString(),
                DealerName:            orderDetails?.DealerName,
                DealerPhone:           orderDetails?.DealerPhone,
                ShippingAddress:       orderDetails?.ShippingAddressLine,
                ShippingCity:          orderDetails?.ShippingCity,
                ShippingState:         orderDetails?.ShippingState,
                ShippingPinCode:       orderDetails?.ShippingPinCode,
                VehicleRegistrationNo: s.Vehicle?.RegistrationNo,
                VehicleType:           s.Vehicle?.VehicleType,
                SlaDeadlineUtc:        s.SlaDeadlineUtc,
                SlaAtRisk:             s.IsSlaAtRisk(),
                PickedUpAt:            s.PickedUpAt,
                DeliveredAt:           s.DeliveredAt,
                TrackingHistory:       tracking
            ));
        }

        return result;
    }
}
