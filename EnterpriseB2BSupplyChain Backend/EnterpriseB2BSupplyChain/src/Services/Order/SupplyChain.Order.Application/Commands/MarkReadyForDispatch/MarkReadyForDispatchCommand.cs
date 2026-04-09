using MediatR;

namespace SupplyChain.Order.Application.Commands.MarkReadyForDispatch;

public record MarkReadyForDispatchCommand(Guid OrderId, Guid WarehouseManagerId) : IRequest;
