using MediatR;

namespace SupplyChain.Order.Application.Commands.MarkInTransit;

public record MarkInTransitCommand(Guid OrderId, Guid ActorId) : IRequest;
