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

        var agent = shipment.AgentId.HasValue
            ? await _agentRepository.GetByIdAsync(shipment.AgentId.Value, ct)
            : null;

        if (command.NewStatus == ShipmentStatus.Delivered)
        {
            shipment.MarkDelivered(command.AgentId, command.Latitude, command.Longitude);

            // Free up the agent and vehicle
            if (shipment.AgentId.HasValue)
            {
                var deliveryAgent = await _agentRepository.GetByIdAsync(shipment.AgentId.Value, ct);
                deliveryAgent?.CompleteDelivery();
            }
        }
        else if (command.NewStatus == ShipmentStatus.VehicleBreakdown)
        {
            // Record tracking event with place
            shipment.UpdateStatus(command.NewStatus, command.AgentId,
                command.Latitude, command.Longitude,
                command.Notes ?? "Vehicle breakdown reported by agent.",
                command.Place);
        }
        else if (command.NewStatus == ShipmentStatus.PickedUp)
        {
            shipment.MarkPickedUp(command.AgentId, command.Latitude, command.Longitude);
        }
        else
        {
            shipment.UpdateStatus(command.NewStatus, command.AgentId,
                command.Latitude, command.Longitude, command.Notes, command.Place);
        }

        await _shipmentRepository.SaveChangesAsync(ct);
        await _agentRepository.SaveChangesAsync(ct);

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

                var statusEvent = new ShipmentStatusEvent(
                    ShipmentId:  shipment.ShipmentId,
                    OrderId:     command.OrderId,
                    OrderNumber: orderDetails.OrderNumber,
                    DealerId:    orderDetails.DealerId,
                    DealerEmail: dealerContact?.Email ?? string.Empty,
                    AgentId:     command.AgentId,
                    AgentName:   agent?.FullName ?? string.Empty,
                    AgentPhone:  agent?.Phone ?? string.Empty,
                    EventType:   eventType,
                    Status:      command.NewStatus.ToString(),
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
}
