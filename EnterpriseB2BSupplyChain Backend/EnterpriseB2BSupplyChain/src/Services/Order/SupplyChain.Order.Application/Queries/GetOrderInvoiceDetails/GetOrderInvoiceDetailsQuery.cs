using MediatR;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.Application.Queries.GetOrderInvoiceDetails;

public record OrderInvoiceLineDto(
    Guid ProductId,
    string ProductName,
    string SKU,
    int Quantity,
    decimal UnitPrice
);

public record OrderInvoiceDetailsDto(
    Guid OrderId,
    Guid DealerId,
    string? DealerEmail,
    string? DealerName,
    decimal TotalAmount,
    string PaymentMode,
    string? ShippingState,
    List<OrderInvoiceLineDto> Lines
);

public record GetOrderInvoiceDetailsQuery(Guid OrderId) : IRequest<OrderInvoiceDetailsDto>;

public class GetOrderInvoiceDetailsQueryHandler
    : IRequestHandler<GetOrderInvoiceDetailsQuery, OrderInvoiceDetailsDto>
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderInvoiceDetailsQueryHandler(IOrderRepository orderRepository)
        => _orderRepository = orderRepository;

    public async Task<OrderInvoiceDetailsDto> Handle(GetOrderInvoiceDetailsQuery query, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(query.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {query.OrderId} not found.");

        return new OrderInvoiceDetailsDto(
            OrderId: order.OrderId,
            DealerId: order.DealerId,
            DealerEmail: order.DealerEmail,
            DealerName: order.DealerName,
            TotalAmount: order.TotalAmount,
            PaymentMode: order.PaymentMode,
            ShippingState: order.ShippingState,
            Lines: order.Lines
                .Select(line => new OrderInvoiceLineDto(
                    line.ProductId,
                    line.ProductName,
                    line.SKU,
                    line.Quantity,
                    line.UnitPrice))
                .ToList());
    }
}
