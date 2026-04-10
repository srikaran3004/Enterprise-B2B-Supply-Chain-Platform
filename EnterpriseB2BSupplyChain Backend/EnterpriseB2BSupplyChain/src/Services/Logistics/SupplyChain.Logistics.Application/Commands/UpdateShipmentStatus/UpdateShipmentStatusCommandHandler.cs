using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Application.Commands.UpdateShipmentStatus;

public class UpdateShipmentStatusCommandHandler : IRequestHandler<UpdateShipmentStatusCommand>
{
    private readonly IShipmentRepository   _shipmentRepository;
    private readonly IAgentRepository      _agentRepository;
    private readonly ITrackingCacheService _cache;
    private readonly IShipmentEventPublisher _eventPublisher;
    private readonly IOrderServiceClient   _orderServiceClient;
    private readonly IIdentityServiceClient _identityServiceClient;

    public UpdateShipmentStatusCommandHandler(
        IShipmentRepository   shipmentRepository,
        IAgentRepository      agentRepository,
        ITrackingCacheService cache,
        IShipmentEventPublisher eventPublisher,
        IOrderServiceClient   orderServiceClient,
        IIdentityServiceClient identityServiceClient)
    {
        _shipmentRepository    = shipmentRepository;
        _agentRepository       = agentRepository;
        _cache                 = cache;
        _eventPublisher        = eventPublisher;
        _orderServiceClient    = orderServiceClient;
        _identityServiceClient = identityServiceClient;
    }

    public async Task Handle(UpdateShipmentStatusCommand command, CancellationToken ct)
    {
        var shipment = await _shipmentRepository.GetByOrderIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"No shipment found for order {command.OrderId}.");

        if (shipment.AgentId is null)
            throw new UnauthorizedAccessException("No delivery agent is assigned to this shipment.");

        var actorAgent = await ResolveAgentForUserAsync(command.AgentId, command.AgentFullName, ct);
        if (actorAgent is null || actorAgent.AgentId != shipment.AgentId.Value)
            throw new UnauthorizedAccessException("You are not assigned to this shipment.");

        var assignedAgent = shipment.Agent
            ?? await _agentRepository.GetByIdAsync(shipment.AgentId.Value, ct);

        var assignedAgentId = shipment.AgentId.Value;
        var agent = assignedAgent;

        if (command.NewStatus == ShipmentStatus.PickedUp)
        {
            var pickupMarked = await _shipmentRepository.AtomicMarkPickedUpAsync(
                shipment.ShipmentId,
                assignedAgentId,
                command.Latitude,
                command.Longitude,
                ct);

            if (!pickupMarked)
                throw new InvalidOperationException("Shipment is no longer eligible for pickup confirmation.");
        }
        else
        {
            var statusUpdated = await _shipmentRepository.AtomicUpdateStatusAsync(
                shipment.ShipmentId,
                assignedAgentId,
                command.NewStatus,
                command.Latitude,
                command.Longitude,
                command.Notes,
                command.Place,
                ct);

            if (!statusUpdated)
                throw new InvalidOperationException("Shipment status could not be updated due to concurrent changes.");
        }

        // Keep HUL_OrderDb status history in sync for dealer/admin order timelines.
        if (command.NewStatus is ShipmentStatus.PickedUp or ShipmentStatus.InTransit or ShipmentStatus.OutForDelivery or ShipmentStatus.VehicleBreakdown)
        {
            _ = await _orderServiceClient.MarkInTransitAsync(command.OrderId, ct);
        }
        else if (command.NewStatus == ShipmentStatus.Delivered)
        {
            _ = await _orderServiceClient.MarkDeliveredAsync(command.OrderId, ct);
        }

        // Update Redis with latest GPS + status
        await _cache.SetLatestLocationAsync(
            command.OrderId,
            command.Latitude,
            command.Longitude,
            command.NewStatus.ToString(),
            ct);

        // Publish notification event to RabbitMQ
        try
        {
            var orderDetails = await _orderServiceClient.GetOrderNotificationDetailsAsync(command.OrderId, ct);
            if (orderDetails is not null)
            {
                var dealerContact = await _identityServiceClient.GetDealerContactAsync(orderDetails.DealerId, ct);
                var agentContact  = agent is not null
                    ? await _identityServiceClient.GetUserContactAsync(agent.UserId, ct)
                    : null;

                var eventType = command.NewStatus switch
                {
                    ShipmentStatus.Delivered       => "OrderDelivered",
                    ShipmentStatus.VehicleBreakdown => "VehicleBreakdown",
                    _                              => "ShipmentStatusUpdated"
                };
                var updatedAt = DateTime.UtcNow;

                var statusEvent = new ShipmentStatusEvent(
                    ShipmentId:  shipment.ShipmentId,
                    OrderId:     command.OrderId,
                    OrderNumber: orderDetails.OrderNumber,
                    DealerId:    orderDetails.DealerId,
                    DealerEmail: dealerContact?.Email ?? string.Empty,
                    DealerName:  orderDetails.DealerName ?? "Dealer",
                    AgentId:     assignedAgentId,
                    AgentUserId: agent?.UserId ?? Guid.Empty,
                    AgentName:   agent?.FullName ?? string.Empty,
                    AgentPhone:  agent?.Phone ?? string.Empty,
                    VehicleRegistrationNo: shipment.Vehicle?.RegistrationNo,
                    VehicleType: shipment.Vehicle?.VehicleType,
                    EventType:   eventType,
                    Status:      command.NewStatus.ToString(),
                    UpdatedAt:   updatedAt,
                    Place:       command.Place,
                    Notes:       command.Notes
                );

                await _eventPublisher.PublishAsync(statusEvent, ct);
            }
        }
        catch
        {
            // Non-critical — don't fail the status update if notification fails
        }
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
