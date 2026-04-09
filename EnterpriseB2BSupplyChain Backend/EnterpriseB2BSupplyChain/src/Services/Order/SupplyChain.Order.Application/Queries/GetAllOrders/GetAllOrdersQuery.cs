using MediatR;
using SupplyChain.Order.Application.DTOs;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Application.Queries.GetAllOrders;

public record GetAllOrdersQuery(
    OrderStatus? StatusFilter = null,
    int          Page = 1,
    int          PageSize = 10
) : IRequest<PagedResult<OrderSummaryDto>>;
