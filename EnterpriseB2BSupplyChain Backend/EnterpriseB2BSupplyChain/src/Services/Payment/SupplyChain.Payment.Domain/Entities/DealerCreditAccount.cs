using SupplyChain.Payment.Domain.Exceptions;

namespace SupplyChain.Payment.Domain.Entities;

/// <summary>
/// Represents the monthly purchase account for a dealer.
/// Each dealer has a MonthlyPurchaseLimit — the maximum total value of
/// orders they can place every month. When the limit is exceeded,
/// new orders go to Admin for approval (OnHold).
/// Outstanding is automatically tracked and resets conceptually
/// via invoice lifecycle (paid invoices free up the limit).
/// </summary>
public class DealerCreditAccount
{
    public Guid    AccountId          { get; private set; }
    public Guid    DealerId           { get; private set; }

    /// <summary>Maximum monthly purchase limit assigned by Admin (e.g. ₹5,00,000).</summary>
    public decimal CreditLimit        { get; private set; }

    /// <summary>Total amount currently utilized (sum of unpaid invoices + reserved orders).</summary>
    public decimal CurrentOutstanding { get; private set; }

    /// <summary>Amount reserved for orders that are placed but not yet confirmed or approved.</summary>
    public decimal ReservedAmount     { get; private set; }

    /// <summary>Month-start UTC timestamp for the latest monthly reset cycle.</summary>
    public DateTime LastMonthlyResetAt { get; private set; }

    /// <summary>Remaining purchase limit the dealer can use for new orders.</summary>
    public decimal AvailableCredit    => CreditLimit - CurrentOutstanding - ReservedAmount;
    public DateTime? LastUpdatedAt   { get; private set; }

    private DealerCreditAccount() { }

    public static DealerCreditAccount Create(Guid dealerId, decimal creditLimit = 500_000m)
    {
        var now = DateTime.UtcNow;
        return new()
        {
            AccountId          = Guid.NewGuid(),
            DealerId           = dealerId,
            CreditLimit        = creditLimit,
            CurrentOutstanding = 0,
            LastMonthlyResetAt = MonthStart(now)
        };
    }

    /// <summary>Can the dealer accommodate a new order of the given amount within their remaining limit?</summary>
    public bool CanAccommodate(decimal amount) => AvailableCredit >= amount;

    /// <summary>Admin updates the monthly purchase limit for this dealer.</summary>
    public void UpdateCreditLimit(decimal newLimit)
    {
        if (newLimit <= 0)
            throw new DomainException("INVALID_LIMIT", "Monthly purchase limit must be positive.");

        CreditLimit   = newLimit;
        LastUpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Reserve a portion of the purchase limit for a new order.</summary>
    public void ReserveAmount(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("INVALID_AMOUNT", "Amount must be positive.");

        ReservedAmount += amount;
        LastUpdatedAt   = DateTime.UtcNow;
    }

    /// <summary>Finalize reserved amount by moving it to CurrentOutstanding.</summary>
    public void FinalizeReserve(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("INVALID_AMOUNT", "Amount must be positive.");

        ReservedAmount = Math.Max(0, ReservedAmount - amount);
        CurrentOutstanding += amount;
        LastUpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Release reserved amount without moving it to CurrentOutstanding (e.g. order cancelled).</summary>
    public void ReleaseReserve(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("INVALID_AMOUNT", "Amount must be positive.");

        ReservedAmount = Math.Max(0, ReservedAmount - amount);
        LastUpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Directly add outstanding amount (if bypassing reserve).</summary>
    public void AddOutstanding(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("INVALID_AMOUNT", "Amount must be positive.");

        CurrentOutstanding += amount;
        LastUpdatedAt       = DateTime.UtcNow;
    }

    /// <summary>Free up purchase limit when a payment is received or order is cancelled.</summary>
    public void ReduceOutstanding(decimal amount)
    {
        CurrentOutstanding = Math.Max(0, CurrentOutstanding - amount);
        LastUpdatedAt      = DateTime.UtcNow;
    }

    /// <summary>
    /// Resets monthly utilization when a new month starts.
    /// Returns true when a reset was applied.
    /// </summary>
    public bool EnsureMonthlyReset(DateTime utcNow)
    {
        var cycleStart = MonthStart(utcNow);
        if (LastMonthlyResetAt >= cycleStart)
            return false;

        CurrentOutstanding = 0;
        ReservedAmount = 0;
        LastMonthlyResetAt = cycleStart;
        LastUpdatedAt = utcNow;
        return true;
    }

    private static DateTime MonthStart(DateTime utcNow)
        => new(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
}
