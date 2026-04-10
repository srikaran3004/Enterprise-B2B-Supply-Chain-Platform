using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetMyShipments;

public record GetMyShipmentsQuery(Guid AgentUserId, string? AgentFullName = null) : IRequest<List<AgentShipmentDto>>;

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
    private readonly IIdentityServiceClient _identityServiceClient;

    public GetMyShipmentsQueryHandler(
        IShipmentRepository shipmentRepository,
        IAgentRepository    agentRepository,
        IOrderServiceClient orderServiceClient,
        IIdentityServiceClient identityServiceClient)
    {
        _shipmentRepository = shipmentRepository;
        _agentRepository    = agentRepository;
        _orderServiceClient = orderServiceClient;
        _identityServiceClient = identityServiceClient;
    }

    public async Task<List<AgentShipmentDto>> Handle(GetMyShipmentsQuery query, CancellationToken ct)
    {
        var agent = await ResolveAgentForUserAsync(query.AgentUserId, query.AgentFullName, ct);

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

    private async Task<Domain.Entities.DeliveryAgent?> ResolveAgentForUserAsync(
        Guid userId,
        string? fullNameHint,
        CancellationToken ct)
    {
        var directAgent = await _agentRepository.GetByUserIdAsync(userId, ct);
        if (directAgent is not null)
            return directAgent;

        var fullName = fullNameHint;
        if (string.IsNullOrWhiteSpace(fullName))
        {
            var userContact = await _identityServiceClient.GetUserContactAsync(userId, ct);
            fullName = userContact?.FullName;
        }

        if (string.IsNullOrWhiteSpace(fullName))
            return null;

        var byNameAgent = await _agentRepository.GetByFullNameAsync(fullName, ct);
        if (byNameAgent is null)
            return null;

        // Self-heal stale seed linkage when this userId is not mapped yet.
        var userAlreadyLinked = await _agentRepository.ExistsByUserIdAsync(userId, ct);
        if (!userAlreadyLinked && byNameAgent.UserId != userId)
        {
            byNameAgent.LinkToUser(userId);
            await _agentRepository.SaveChangesAsync(ct);
        }

        return byNameAgent;
    }
}
