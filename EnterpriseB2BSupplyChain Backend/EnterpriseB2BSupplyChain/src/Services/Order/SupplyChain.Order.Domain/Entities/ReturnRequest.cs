using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Domain.Entities;

public class ReturnRequest
{
    public Guid         ReturnId    { get; private set; }
    public Guid         OrderId     { get; private set; }
    public Guid         DealerId    { get; private set; }
    public string       Reason      { get; private set; } = string.Empty;
    public string?      PhotoUrl    { get; private set; }
    public ReturnStatus Status      { get; private set; }
    public string?      AdminNotes  { get; private set; }
    public DateTime     RequestedAt { get; private set; }
    public DateTime?    ResolvedAt  { get; private set; }

    public Order Order { get; private set; } = null!;

    private ReturnRequest() { }

    public static ReturnRequest Create(
        Guid    orderId,
        Guid    dealerId,
        string  reason,
        string? photoUrl = null)
        => new()
        {
            ReturnId    = Guid.NewGuid(),
            OrderId     = orderId,
            DealerId    = dealerId,
            Reason      = reason,
            PhotoUrl    = photoUrl,
            Status      = ReturnStatus.Pending,
            RequestedAt = DateTime.UtcNow
        };

    public void Approve(string? adminNotes = null)
    {
        if (Status == ReturnStatus.Approved)
            return;

        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException("Only pending return requests can be approved.");

        Status     = ReturnStatus.Approved;
        AdminNotes = adminNotes;
        ResolvedAt = DateTime.UtcNow;
    }

    public void Reject(string? adminNotes = null)
    {
        if (Status == ReturnStatus.Rejected)
            return;

        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException("Only pending return requests can be rejected.");

        Status     = ReturnStatus.Rejected;
        AdminNotes = adminNotes;
        ResolvedAt = DateTime.UtcNow;
    }
}
