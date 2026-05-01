namespace SupplyChain.Order.Domain.Enums;

public enum OrderStatus
{
    Placed,
    PaymentPending,
    PaymentFailed,
    OnHold,
    Processing,
    ReadyForDispatch,
    InTransit,
    Delivered,
    ReturnRequested,
    Closed,
    Cancelled
}
