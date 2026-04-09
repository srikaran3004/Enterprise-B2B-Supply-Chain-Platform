namespace SupplyChain.Order.Application.DTOs;

public record OrderLineDto(
    Guid    OrderLineId,
    Guid    ProductId,
    string  ProductName,
    string  SKU,
    decimal UnitPrice,
    int     Quantity,
    decimal LineTotal
);
