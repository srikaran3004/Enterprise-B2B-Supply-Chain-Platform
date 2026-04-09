using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Application.Commands.CreateShipment;

public class CreateShipmentCommandHandler : IRequestHandler<CreateShipmentCommand, Guid>
{
    private readonly IShipmentRepository _shipmentRepository;

    public CreateShipmentCommandHandler(IShipmentRepository shipmentRepository)
        => _shipmentRepository = shipmentRepository;

    public async Task<Guid> Handle(CreateShipmentCommand command, CancellationToken ct)
    {
        // Check if shipment already exists for this order (idempotent)
        var existing = await _shipmentRepository.GetByOrderIdAsync(command.OrderId, ct);
        if (existing is not null)
            return existing.ShipmentId;

        var shipment = Shipment.Create(command.OrderId, command.SlaDeadlineUtc);
        await _shipmentRepository.AddAsync(shipment, ct);
        await _shipmentRepository.SaveChangesAsync(ct);
        return shipment.ShipmentId;
    }
}
