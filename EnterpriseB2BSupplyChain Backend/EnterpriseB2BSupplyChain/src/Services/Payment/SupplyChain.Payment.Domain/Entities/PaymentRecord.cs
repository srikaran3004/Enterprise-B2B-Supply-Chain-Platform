namespace SupplyChain.Payment.Domain.Entities;

public class PaymentRecord
{
    public Guid      PaymentId     { get; private set; }
    public Guid      OrderId       { get; private set; }
    public Guid      DealerId      { get; private set; }
    public decimal   Amount        { get; private set; }
    public string    Status        { get; private set; } = "Pending";
    public string    PaymentMode   { get; private set; } = string.Empty;
    public string?   ReferenceNo   { get; private set; }
    public DateTime  CreatedAt     { get; private set; }
    public DateTime? PaidAt        { get; private set; }

    private PaymentRecord() { }

    public static PaymentRecord Create(
        Guid    orderId,
        Guid    dealerId,
        decimal amount,
        string  paymentMode)
        => new()
        {
            PaymentId   = Guid.NewGuid(),
            OrderId     = orderId,
            DealerId    = dealerId,
            Amount      = amount,
            Status      = "Pending",
            PaymentMode = paymentMode,
            CreatedAt   = DateTime.UtcNow
        };

    public void MarkPaid(string referenceNo)
    {
        Status      = "Paid";
        ReferenceNo = referenceNo;
        PaidAt      = DateTime.UtcNow;
    }

    public void MarkFailed(string? referenceNo = null)
    {
        Status = "Failed";
        ReferenceNo = string.IsNullOrWhiteSpace(referenceNo) ? ReferenceNo : referenceNo;
        PaidAt = null;
    }
}
