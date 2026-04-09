using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.DTOs;

namespace SupplyChain.Order.Application.Queries.GetAllOrders;

public class GetAllOrdersQueryHandler : IRequestHandler<GetAllOrdersQuery, PagedResult<OrderSummaryDto>>
{
    private readonly IOrderRepository _orderRepository;

    public GetAllOrdersQueryHandler(IOrderRepository orderRepository)
        => _orderRepository = orderRepository;

    public async Task<PagedResult<OrderSummaryDto>> Handle(GetAllOrdersQuery query, CancellationToken ct)
    {
        var orders = await _orderRepository.GetAllAsync(query.StatusFilter, ct);

        var totalCount = orders.Count;

        var items = orders
            .OrderByDescending(o => o.PlacedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(o => new OrderSummaryDto(
                o.OrderId, o.OrderNumber, o.Status.ToString(),
                o.TotalAmount, o.PaymentMode,
                o.Lines.Sum(l => l.Quantity),
                o.PlacedAt, o.UpdatedAt,
                o.ShippingAddressLine, o.ShippingCity, o.ShippingPinCode,
                o.Lines.Select(l => new OrderLineDto(
                    l.OrderLineId,
                    l.ProductId,
                    l.ProductName,
                    l.SKU,
                    l.UnitPrice,
                    l.Quantity,
                    l.LineTotal
                )).ToList(),
                o.DealerName, o.DealerEmail, o.ShippingState
            )).ToList();

        return new PagedResult<OrderSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }
}
