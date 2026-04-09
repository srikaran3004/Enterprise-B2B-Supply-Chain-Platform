using MediatR;

namespace SupplyChain.Order.Application.Commands.ApproveOrder;

public record ApproveOrderCommand(Guid OrderId, Guid AdminId) : IRequest;
