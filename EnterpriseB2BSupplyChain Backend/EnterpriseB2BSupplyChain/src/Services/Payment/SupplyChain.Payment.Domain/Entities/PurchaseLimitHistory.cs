namespace SupplyChain.Payment.Domain.Entities;

public class PurchaseLimitHistory
{
    public Guid HistoryId { get; private set; }
    public Guid DealerId { get; private set; }
    public decimal PreviousLimit { get; private set; }
    public decimal NewLimit { get; private set; }
    public DateTime ChangedAt { get; private set; }
    public Guid? ChangedByUserId { get; private set; }
    public string ChangedByRole { get; private set; } = string.Empty;
    public string? Reason { get; private set; }

    private PurchaseLimitHistory() { }

    public static PurchaseLimitHistory Create(
        Guid dealerId,
        decimal previousLimit,
        decimal newLimit,
        DateTime changedAtUtc,
        Guid? changedByUserId,
        string changedByRole,
        string? reason)
    {
        return new PurchaseLimitHistory
        {
            HistoryId = Guid.NewGuid(),
            DealerId = dealerId,
            PreviousLimit = previousLimit,
            NewLimit = newLimit,
            ChangedAt = changedAtUtc,
            ChangedByUserId = changedByUserId,
            ChangedByRole = changedByRole,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim()
        };
    }
}
