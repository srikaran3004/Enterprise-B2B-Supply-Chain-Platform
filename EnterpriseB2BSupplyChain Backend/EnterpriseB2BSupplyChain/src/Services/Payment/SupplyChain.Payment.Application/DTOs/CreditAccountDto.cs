namespace SupplyChain.Payment.Application.DTOs;

/// <summary>
/// Returned to the frontend for the dealer's monthly purchase account summary.
/// Field names are kept backward-compatible with the existing API contract,
/// but the semantics are "Monthly Purchase Limit" based.
/// </summary>
public record CreditAccountDto(
    Guid AccountId,
    Guid DealerId,
    /// <summary>Monthly purchase limit set by Admin.</summary>
    decimal PurchaseLimit,
    /// <summary>Amount already utilized this cycle (sum of unpaid invoices).</summary>
    decimal UtilizedAmount,
    /// <summary>Remaining purchase limit the dealer can still use.</summary>
    decimal AvailableLimit,
    /// <summary>Usage percentage (UtilizedAmount / PurchaseLimit x 100).</summary>
    int UtilizationPercent,
    DateTime? LastUpdatedAt
);
