using MediatR;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Application.Commands.RateShipment;

public class RateShipmentCommandHandler : IRequestHandler<RateShipmentCommand, RateShipmentResult>
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IAgentRepository    _agentRepository;
    private readonly IOrderServiceClient _orderServiceClient;

    public RateShipmentCommandHandler(
        IShipmentRepository shipmentRepository,
        IAgentRepository    agentRepository,
        IOrderServiceClient orderServiceClient)
    {
        _shipmentRepository = shipmentRepository;
        _agentRepository    = agentRepository;
        _orderServiceClient = orderServiceClient;
    }

    public async Task<RateShipmentResult> Handle(RateShipmentCommand command, CancellationToken ct)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(command.ShipmentId, ct)
            ?? throw new KeyNotFoundException($"Shipment {command.ShipmentId} not found.");

        var order = await _orderServiceClient.GetOrderNotificationDetailsAsync(shipment.OrderId, ct)
            ?? throw new InvalidOperationException("Unable to validate shipment ownership right now. Please retry.");

        if (order.DealerId != command.DealerId)
            throw new UnauthorizedAccessException("You can only rate shipments for your own orders.");

        shipment.RateDelivery(command.Rating, command.Feedback);

        var agent = await _agentRepository.GetByIdAsync(shipment.AgentId!.Value, ct)
            ?? throw new KeyNotFoundException($"Agent {shipment.AgentId} not found.");

        agent.RecordDeliveryRating(command.Rating);

        await _shipmentRepository.SaveChangesAsync(ct);

        return new RateShipmentResult(
            shipment.ShipmentId,
            command.Rating,
            command.Feedback,
            agent.AverageRating,
            agent.TotalDeliveries);
    }
}
