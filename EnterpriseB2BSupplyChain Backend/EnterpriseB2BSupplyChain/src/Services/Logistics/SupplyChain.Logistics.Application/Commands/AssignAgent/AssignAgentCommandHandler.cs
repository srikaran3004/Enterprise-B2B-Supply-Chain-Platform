using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Events;

namespace SupplyChain.Logistics.Application.Commands.AssignAgent;

public class AssignAgentCommandHandler : IRequestHandler<AssignAgentCommand, AssignAgentResult>
{
    private readonly IShipmentRepository          _shipmentRepository;
    private readonly IAgentRepository             _agentRepository;
    private readonly IIdentityServiceClient       _identityServiceClient;
    private readonly IOrderServiceClient          _orderServiceClient;
    private readonly IAgentAssignedEventPublisher _eventPublisher;

    public AssignAgentCommandHandler(
        IShipmentRepository shipmentRepository,
        IAgentRepository agentRepository,
        IIdentityServiceClient identityServiceClient,
        IOrderServiceClient orderServiceClient,
        IAgentAssignedEventPublisher eventPublisher)
    {
        _shipmentRepository    = shipmentRepository;
        _agentRepository       = agentRepository;
        _identityServiceClient = identityServiceClient;
        _orderServiceClient    = orderServiceClient;
        _eventPublisher        = eventPublisher;
    }

    public async Task<AssignAgentResult> Handle(AssignAgentCommand command, CancellationToken ct)
    {
        // Auto-advance the order to ReadyForDispatch if payment has been confirmed.
        var orderAdvanced = await _orderServiceClient.AdvanceToReadyForDispatchAsync(command.OrderId, ct);
        if (!orderAdvanced)
        {
            throw new InvalidOperationException(
                "Cannot assign a delivery agent until the order payment is confirmed and the order is ready for dispatch.");
        }

        // Resolve agent and vehicle for human-readable response + notification payload.
        // These reads are AsNoTracking-safe because the actual UPDATEs happen in
        // AtomicAssignAsync via ExecuteUpdateAsync (raw SQL, no change tracker).
        var agent = await _agentRepository.GetByIdAsync(command.AgentId, ct)
            ?? throw new KeyNotFoundException($"Agent {command.AgentId} not found.");

        var vehicle = await _agentRepository.GetVehicleByIdAsync(command.VehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {command.VehicleId} not found.");

        // ------------------------------------------------------------------
        // Atomic assignment: upserts shipment, claims agent, claims vehicle,
        // advances shipment status, and inserts the tracking event — all
        // inside one DB transaction with row-level conditional UPDATEs.
        //
        // This bypasses the EF change tracker entirely and is immune to the
        // DbUpdateConcurrencyException ("0 rows affected") that the previous
        // tracked-entity approach was hitting.
        // ------------------------------------------------------------------
        var slaDeadline = command.SlaDeadlineUtc ?? DateTime.UtcNow.AddHours(72);
        var shipmentId  = await _shipmentRepository.AtomicAssignAsync(
            command.OrderId, agent.AgentId, vehicle.VehicleId, slaDeadline, ct);

        if (shipmentId is null)
            throw new InvalidOperationException(
                "Assignment failed. The agent or vehicle is not available, " +
                "or the shipment is not in pending state.");

        // ------------------------------------------------------------------
        // Build and publish the notification event (best-effort).
        // ------------------------------------------------------------------
        OrderNotificationDetailsDto? orderDetails = null;
        try { orderDetails = await _orderServiceClient.GetOrderNotificationDetailsAsync(command.OrderId, ct); }
        catch { /* non-critical — notification is best-effort */ }

        var dealerContact = orderDetails is null ? null
            : await _identityServiceClient.GetDealerContactAsync(orderDetails.DealerId, ct);
        var agentContact = await _identityServiceClient.GetUserContactAsync(agent.UserId, ct);

        var agentAssignedEvent = new AgentAssigned(
            ShipmentId:          shipmentId.Value,
            OrderId:             command.OrderId,
            OrderNumber:         orderDetails?.OrderNumber ?? command.OrderId.ToString(),
            DealerId:            orderDetails?.DealerId ?? Guid.Empty,
            DealerEmail:         dealerContact?.Email ?? string.Empty,
            DealerName:          orderDetails?.DealerName ?? dealerContact?.FullName ?? "Dealer",
            AgentId:             agent.AgentId,
            AgentUserId:         agent.UserId,
            AgentName:           agent.FullName,
            AgentPhone:          agent.Phone,
            VehicleNo:           vehicle.RegistrationNo,
            AgentEmail:          agentContact?.Email ?? string.Empty,
            ShippingAddressLine: orderDetails?.ShippingAddressLine ?? string.Empty,
            ShippingCity:        orderDetails?.ShippingCity ?? string.Empty,
            ShippingPinCode:     orderDetails?.ShippingPinCode ?? string.Empty
        );

        try { await _eventPublisher.PublishAsync(agentAssignedEvent, ct); }
        catch { /* Notification publish failed — assignment already succeeded */ }

        return new AssignAgentResult(
            shipmentId.Value,
            agent.FullName,
            agent.Phone,
            vehicle.RegistrationNo);
    }
}
