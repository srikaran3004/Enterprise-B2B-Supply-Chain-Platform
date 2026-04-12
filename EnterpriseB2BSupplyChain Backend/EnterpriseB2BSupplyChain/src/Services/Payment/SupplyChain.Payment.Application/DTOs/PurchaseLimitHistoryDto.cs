namespace SupplyChain.Payment.Application.DTOs;

public record PurchaseLimitHistoryDto(
    Guid HistoryId,
    Guid DealerId,
    decimal PreviousLimit,
    decimal NewLimit,
    DateTime ChangedAt,
    Guid? ChangedByUserId,
    string ChangedByRole,
    string? Reason
);
