namespace SupplyChain.Order.Domain.Entities;

public class OrderStatusHistory
{
    public Guid   HistoryId      { get; private set; }
    public Guid   OrderId        { get; private set; }
    public string FromStatus     { get; private set; } = string.Empty;
    public string ToStatus       { get; private set; } = string.Empty;
    public Guid?  ChangedByUserId{ get; private set; }
    public string? Notes         { get; private set; }
    public DateTime ChangedAt    { get; private set; }

    public Order Order { get; private set; } = null!;

    private OrderStatusHistory() { }

    public static OrderStatusHistory Create(
        Guid    orderId,
        string  fromStatus,
        string  toStatus,
        Guid?   changedByUserId = null,
        string? notes           = null)
        => new()
        {
            HistoryId       = Guid.NewGuid(),
            OrderId         = orderId,
            FromStatus      = fromStatus,
            ToStatus        = toStatus,
            ChangedByUserId = changedByUserId,
            Notes           = notes,
            ChangedAt       = DateTime.UtcNow
        };
}
