using MediatR;

namespace SupplyChain.Order.Application.Commands.CancelOrder;

public record CancelOrderCommand(Guid OrderId, Guid ActorId, string Reason, string? DealerEmail = null) : IRequest;
