namespace SupplyChain.Payment.Application.DTOs;

public record CreditCheckDto(
    bool    Approved,
    decimal AvailableLimit,
    decimal PurchaseLimit,
    decimal UtilizedAmount
);
