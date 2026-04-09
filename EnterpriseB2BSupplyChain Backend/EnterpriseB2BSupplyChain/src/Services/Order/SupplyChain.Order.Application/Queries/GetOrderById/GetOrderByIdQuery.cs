using MediatR;
using SupplyChain.Order.Application.DTOs;

namespace SupplyChain.Order.Application.Queries.GetOrderById;

public record GetOrderByIdQuery(Guid OrderId) : IRequest<OrderDetailDto>;
