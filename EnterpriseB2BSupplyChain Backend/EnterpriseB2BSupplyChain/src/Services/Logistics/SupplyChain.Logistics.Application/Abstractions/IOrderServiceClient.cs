namespace SupplyChain.Logistics.Application.Abstractions;

public interface IOrderServiceClient
{
    Task<OrderNotificationDetailsDto?> GetOrderNotificationDetailsAsync(Guid orderId, CancellationToken ct);
    /// <summary>
    /// Attempts to auto-advance an order through Placed/OnHold → Processing → ReadyForDispatch
    /// so the Logistics portal can assign an agent without manual admin approval.
    /// </summary>
    Task<bool> AdvanceToReadyForDispatchAsync(Guid orderId, CancellationToken ct);
    Task<bool> MarkInTransitAsync(Guid orderId, CancellationToken ct);
    Task<bool> MarkDeliveredAsync(Guid orderId, CancellationToken ct);
}

public record OrderNotificationDetailsDto(
    Guid    OrderId,
    string  OrderNumber,
    Guid    DealerId,
    string  ShippingAddressLine,
    string  ShippingCity,
    string  ShippingPinCode,
    string? ShippingState  = null,
    string? DealerName     = null,
    string? DealerPhone    = null
);
