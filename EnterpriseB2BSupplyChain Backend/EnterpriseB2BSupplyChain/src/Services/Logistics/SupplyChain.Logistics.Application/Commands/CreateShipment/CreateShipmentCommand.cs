using MediatR;

namespace SupplyChain.Logistics.Application.Commands.CreateShipment;

public record CreateShipmentCommand(
    Guid     OrderId,
    Guid     DealerId,
    DateTime SlaDeadlineUtc
) : IRequest<Guid>;
