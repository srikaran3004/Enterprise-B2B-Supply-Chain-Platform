namespace SupplyChain.Order.Domain.Enums;

public enum OrderStatus
{
    Placed,
    OnHold,
    Processing,
    ReadyForDispatch,
    InTransit,
    Delivered,
    ReturnRequested,
    Closed,
    Cancelled
}
