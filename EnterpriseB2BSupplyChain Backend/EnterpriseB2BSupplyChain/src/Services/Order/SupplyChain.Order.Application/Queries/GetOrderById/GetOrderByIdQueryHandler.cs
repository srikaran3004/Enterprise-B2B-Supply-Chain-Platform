using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.DTOs;

namespace SupplyChain.Order.Application.Queries.GetOrderById;

public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDetailDto>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderByIdQueryHandler(IOrderRepository orderRepository)
        => _orderRepository = orderRepository;

    public async Task<OrderDetailDto> Handle(GetOrderByIdQuery query, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(query.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {query.OrderId} not found.");

        return new OrderDetailDto(
            OrderId:       order.OrderId,
            OrderNumber:   order.OrderNumber,
            DealerId:      order.DealerId,
            DealerName:    order.DealerName,
            DealerEmail:   order.DealerEmail,
            Status:        order.Status.ToString(),
            PaymentStatus: order.PaymentStatus.ToString(),
            TotalAmount:   order.TotalAmount,
            PaymentMode:   order.PaymentMode,
            Notes:         order.Notes,
            PlacedAt:      order.PlacedAt,
            UpdatedAt:     order.UpdatedAt,
            ShippingAddressLabel: order.ShippingAddressLabel,
            ShippingAddressLine: order.ShippingAddressLine,
            ShippingCity:        order.ShippingCity,
            ShippingState:       order.ShippingState,
            ShippingPinCode:     order.ShippingPinCode,
            Lines: order.Lines.Select(l => new OrderLineDto(
                l.OrderLineId, l.ProductId, l.ProductName,
                l.SKU, l.UnitPrice, l.Quantity, l.LineTotal
            )).ToList(),
            StatusHistory: order.StatusHistory
                .OrderBy(h => h.ChangedAt)
                .Select(h => new StatusHistoryDto(
                    h.FromStatus, h.ToStatus, h.Notes, h.ChangedAt
                )).ToList()
        );
    }
}
