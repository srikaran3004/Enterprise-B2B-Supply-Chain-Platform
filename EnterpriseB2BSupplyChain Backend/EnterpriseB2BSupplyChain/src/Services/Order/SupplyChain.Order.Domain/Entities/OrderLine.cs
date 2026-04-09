using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Domain.Entities;

public class OrderLine
{
    public Guid   OrderLineId  { get; private set; }
    public Guid   OrderId      { get; private set; }
    public Guid   ProductId    { get; private set; }

    // Snapshot values — captured at time of order placement
    // These never change even if product is updated later
    public string ProductName  { get; private set; } = string.Empty;
    public string SKU          { get; private set; } = string.Empty;
    public decimal UnitPrice   { get; private set; }
    public int    Quantity     { get; private set; }
    public decimal LineTotal   => UnitPrice * Quantity;

    // Navigation
    public Order Order { get; private set; } = null!;

    private OrderLine() { }

    public static OrderLine Create(
        Guid    orderId,
        Guid    productId,
        string  productName,
        string  sku,
        decimal unitPrice,
        int     quantity)
    {
        if (quantity <= 0)
            throw new DomainException("INVALID_QTY", "Quantity must be at least 1.");

        if (unitPrice <= 0)
            throw new DomainException("INVALID_PRICE", "Unit price must be greater than zero.");

        return new OrderLine
        {
            OrderLineId = Guid.NewGuid(),
            OrderId     = orderId,
            ProductId   = productId,
            ProductName = productName,
            SKU         = sku,
            UnitPrice   = unitPrice,
            Quantity    = quantity
        };
    }
}
