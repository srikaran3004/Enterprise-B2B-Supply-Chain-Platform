using MediatR;
using SupplyChain.Order.Application.DTOs;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Application.Queries.GetMyOrders;

public record GetMyOrdersQuery(
    Guid         DealerId,
    OrderStatus? StatusFilter = null,
    int          Page = 1,
    int          PageSize = 10
) : IRequest<PagedResult<OrderSummaryDto>>;
