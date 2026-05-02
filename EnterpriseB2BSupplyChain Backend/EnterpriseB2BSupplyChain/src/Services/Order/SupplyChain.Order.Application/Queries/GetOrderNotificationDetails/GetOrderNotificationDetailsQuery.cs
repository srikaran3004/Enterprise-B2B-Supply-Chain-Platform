using MediatR;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.Application.Queries.GetOrderNotificationDetails;

public record OrderNotificationDetailsDto(
    Guid    OrderId,
    string  OrderNumber,
    Guid    DealerId,
    string  ShippingAddressLine,
    string  ShippingCity,
    string  ShippingState,
    string  ShippingPinCode,
    string? DealerName  = null,
    string? DealerPhone = null
);

public record GetOrderNotificationDetailsQuery(Guid OrderId) : IRequest<OrderNotificationDetailsDto>;

public class GetOrderNotificationDetailsQueryHandler
    : IRequestHandler<GetOrderNotificationDetailsQuery, OrderNotificationDetailsDto>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderNotificationDetailsQueryHandler(IOrderRepository orderRepository)
        => _orderRepository = orderRepository;

    public async Task<OrderNotificationDetailsDto> Handle(GetOrderNotificationDetailsQuery query, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(query.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {query.OrderId} not found.");

        return new OrderNotificationDetailsDto(
            OrderId:             order.OrderId,
            OrderNumber:         order.OrderNumber,
            DealerId:            order.DealerId,
            ShippingAddressLine: order.ShippingAddressLine ?? string.Empty,
            ShippingCity:        order.ShippingCity        ?? string.Empty,
            ShippingState:       order.ShippingState       ?? string.Empty,
            ShippingPinCode:     order.ShippingPinCode     ?? string.Empty,
            DealerName:          order.DealerName
        );
    }
}
