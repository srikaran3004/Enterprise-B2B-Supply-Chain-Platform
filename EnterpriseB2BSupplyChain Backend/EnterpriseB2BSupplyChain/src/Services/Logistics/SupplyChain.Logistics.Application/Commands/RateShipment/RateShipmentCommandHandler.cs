using MediatR;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Application.Commands.RateShipment;

public class RateShipmentCommandHandler : IRequestHandler<RateShipmentCommand, RateShipmentResult>
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IAgentRepository    _agentRepository;

    public RateShipmentCommandHandler(
        IShipmentRepository shipmentRepository,
        IAgentRepository    agentRepository)
    {
        _shipmentRepository = shipmentRepository;
        _agentRepository    = agentRepository;
    }

    public async Task<RateShipmentResult> Handle(RateShipmentCommand command, CancellationToken ct)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(command.ShipmentId, ct)
            ?? throw new KeyNotFoundException($"Shipment {command.ShipmentId} not found.");

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
