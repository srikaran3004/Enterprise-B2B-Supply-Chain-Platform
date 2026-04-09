using MediatR;

namespace SupplyChain.Logistics.Application.Commands.CreateShipment;

public record CreateShipmentCommand(
    Guid     OrderId,
    DateTime SlaDeadlineUtc
) : IRequest<Guid>;
