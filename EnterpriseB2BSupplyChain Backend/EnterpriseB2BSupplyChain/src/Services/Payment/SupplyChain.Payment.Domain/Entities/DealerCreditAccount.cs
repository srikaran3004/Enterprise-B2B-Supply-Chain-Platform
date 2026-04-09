using SupplyChain.Payment.Domain.Exceptions;

namespace SupplyChain.Payment.Domain.Entities;

public class DealerCreditAccount
{
    public Guid    AccountId          { get; private set; }
    public Guid    DealerId           { get; private set; }
    public decimal CreditLimit        { get; private set; }
    public decimal CurrentOutstanding { get; private set; }
    public decimal AvailableCredit    => CreditLimit - CurrentOutstanding;
    public DateTime? LastUpdatedAt   { get; private set; }

    private DealerCreditAccount() { }

    public static DealerCreditAccount Create(Guid dealerId, decimal creditLimit = 500_000m)
        => new()
        {
            AccountId          = Guid.NewGuid(),
            DealerId           = dealerId,
            CreditLimit        = creditLimit,
            CurrentOutstanding = 0
        };

    public bool CanAccommodate(decimal amount) => AvailableCredit >= amount;

    public void UpdateCreditLimit(decimal newLimit)
    {
        if (newLimit <= 0)
            throw new DomainException("INVALID_LIMIT", "Credit limit must be positive.");

        CreditLimit   = newLimit;
        LastUpdatedAt = DateTime.UtcNow;
    }

    public void AddOutstanding(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("INVALID_AMOUNT", "Amount must be positive.");

        CurrentOutstanding += amount;
        LastUpdatedAt       = DateTime.UtcNow;
    }

    public void ReduceOutstanding(decimal amount)
    {
        CurrentOutstanding = Math.Max(0, CurrentOutstanding - amount);
        LastUpdatedAt      = DateTime.UtcNow;
    }
}
