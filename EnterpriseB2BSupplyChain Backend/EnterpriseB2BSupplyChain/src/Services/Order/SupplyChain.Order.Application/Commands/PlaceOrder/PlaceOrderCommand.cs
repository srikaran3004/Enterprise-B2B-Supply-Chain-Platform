using MediatR;

namespace SupplyChain.Order.Application.Commands.PlaceOrder;

public record OrderLineRequest(
    Guid    ProductId,
    string  ProductName,
    string  SKU,
    decimal UnitPrice,
    int     Quantity
);

public record PlaceOrderCommand(
    Guid                   DealerId,
    List<OrderLineRequest> Lines,
    string                 PaymentMode,
    string?                Notes,
    Guid?                  ShippingAddressId = null,
    string?                DealerEmail       = null,
    string?                DealerName        = null
) : IRequest<PlaceOrderResult>;

public record PlaceOrderResult(Guid OrderId, string OrderNumber, string Status, decimal ShippingFee);
