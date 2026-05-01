namespace SupplyChain.Order.Application.DTOs;

public record StatusHistoryDto(
    string   FromStatus,
    string   ToStatus,
    string?  Notes,
    DateTime ChangedAt
);

public record OrderDetailDto(
    Guid                    OrderId,
    string                  OrderNumber,
    Guid                    DealerId,
    string?                 DealerName,
    string?                 DealerEmail,
    string                  Status,
    string                  PaymentStatus,
    decimal                 TotalAmount,
    string                  PaymentMode,
    string?                 Notes,
    DateTime                PlacedAt,
    DateTime?               UpdatedAt,
    string?                 ShippingAddressLabel,
    string?                 ShippingAddressLine,
    string?                 ShippingCity,
    string?                 ShippingState,
    string?                 ShippingPinCode,
    List<OrderLineDto>      Lines,
    List<StatusHistoryDto>  StatusHistory
);
