using SupplyChain.Order.Application.DTOs;

namespace SupplyChain.Order.Application.Views;

public record OrderSummaryView(
    Guid OrderId,
    string OrderNumber,
    string Status,
    string PaymentStatus,
    decimal TotalAmount,
    string PaymentMode,
    int TotalItems,
    DateTime PlacedAt,
    DateTime? UpdatedAt,
    string? ShippingAddressLine = null,
    string? ShippingCity = null,
    string? ShippingPinCode = null,
    List<OrderLineDto>? Lines = null,
    string? DealerName = null,
    string? DealerEmail = null,
    string? ShippingState = null
)
{
    public static OrderSummaryView FromDto(OrderSummaryDto dto) =>
        new(
            dto.OrderId,
            dto.OrderNumber,
            dto.Status,
            dto.PaymentStatus,
            dto.TotalAmount,
            dto.PaymentMode,
            dto.TotalItems,
            dto.PlacedAt,
            dto.UpdatedAt,
            dto.ShippingAddressLine,
            dto.ShippingCity,
            dto.ShippingPinCode,
            dto.Lines,
            dto.DealerName,
            dto.DealerEmail,
            dto.ShippingState
        );
}
