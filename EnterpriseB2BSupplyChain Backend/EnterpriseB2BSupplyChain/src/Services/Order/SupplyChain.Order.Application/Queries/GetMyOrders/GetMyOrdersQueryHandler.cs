using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.DTOs;

namespace SupplyChain.Order.Application.Queries.GetMyOrders;

public class GetMyOrdersQueryHandler : IRequestHandler<GetMyOrdersQuery, PagedResult<OrderSummaryDto>>
{
    private readonly IOrderRepository _orderRepository;

    public GetMyOrdersQueryHandler(IOrderRepository orderRepository)
        => _orderRepository = orderRepository;

    public async Task<PagedResult<OrderSummaryDto>> Handle(GetMyOrdersQuery query, CancellationToken ct)
    {
        var (orders, totalCount) = await _orderRepository.GetByDealerPagedAsync(
            query.DealerId,
            query.StatusFilter,
            query.Page,
            query.PageSize,
            ct);

        var items = orders
            .Select(o => new OrderSummaryDto(
                OrderId:     o.OrderId,
                OrderNumber: o.OrderNumber,
                Status:      o.Status.ToString(),
                TotalAmount: o.TotalAmount,
                PaymentMode: o.PaymentMode,
                TotalItems:  o.Lines.Sum(l => l.Quantity),
                PlacedAt:    o.PlacedAt,
                UpdatedAt:   o.UpdatedAt,
                ShippingAddressLine: o.ShippingAddressLine,
                ShippingCity:        o.ShippingCity,
                ShippingPinCode:     o.ShippingPinCode,
                Lines:       o.Lines.Select(l => new OrderLineDto(
                    l.OrderLineId,
                    l.ProductId,
                    l.ProductName,
                    l.SKU,
                    l.UnitPrice,
                    l.Quantity,
                    l.LineTotal
                )).ToList(),
                ShippingState: o.ShippingState
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
