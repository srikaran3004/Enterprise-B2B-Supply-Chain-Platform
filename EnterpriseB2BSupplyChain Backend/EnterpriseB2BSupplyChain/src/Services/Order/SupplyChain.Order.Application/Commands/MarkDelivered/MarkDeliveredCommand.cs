using MediatR;

namespace SupplyChain.Order.Application.Commands.MarkDelivered;

public record MarkDeliveredCommand(Guid OrderId, Guid ActorId) : IRequest;
