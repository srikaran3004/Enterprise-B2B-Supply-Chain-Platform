namespace SupplyChain.Order.Application.DTOs;

public record OrderSummaryDto(
    Guid     OrderId,
    string   OrderNumber,
    Guid     DealerId,
    string   Status,
    string   PaymentStatus,
    decimal  TotalAmount,
    string   PaymentMode,
    int      TotalItems,
    DateTime PlacedAt,
    DateTime? DeliveredAt,
    DateTime? UpdatedAt,
    string?  ShippingAddressLine = null,
    string?  ShippingCity        = null,
    string?  ShippingPinCode     = null,
    List<OrderLineDto>? Lines    = null,
    string?  DealerName          = null,
    string?  DealerEmail         = null,
    string?  ShippingState       = null
);
