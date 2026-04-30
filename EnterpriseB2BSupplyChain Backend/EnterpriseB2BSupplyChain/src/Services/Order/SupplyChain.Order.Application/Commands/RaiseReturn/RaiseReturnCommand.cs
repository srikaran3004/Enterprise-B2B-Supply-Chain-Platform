using MediatR;

namespace SupplyChain.Order.Application.Commands.RaiseReturn;

public record RaiseReturnCommand(
    Guid    OrderId,
    Guid    DealerId,
    string  Reason,
    string? PhotoUrl = null,
    string? ThumbUrl = null
) : IRequest;
