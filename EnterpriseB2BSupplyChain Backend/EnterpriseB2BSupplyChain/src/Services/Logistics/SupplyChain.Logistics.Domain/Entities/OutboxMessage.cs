namespace SupplyChain.Logistics.Domain.Entities;

public class OutboxMessage
{
    public Guid      MessageId   { get; private set; }
    public string    EventType   { get; private set; } = string.Empty;
    public string    Payload     { get; private set; } = string.Empty;
    public string    Status      { get; private set; } = "Pending";
    public DateTime  CreatedAt   { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public int       RetryCount  { get; private set; }
    public string?   Error       { get; private set; }

    private OutboxMessage() { }

    public static OutboxMessage Create(string eventType, string payload)
        => new()
        {
            MessageId = Guid.NewGuid(),
            EventType = eventType,
            Payload   = payload,
            Status    = "Pending",
            CreatedAt = DateTime.UtcNow
        };

    public void MarkPublished()
    {
        Status      = "Published";
        PublishedAt = DateTime.UtcNow;
    }

    public void MarkFailed(string error)
    {
        RetryCount++;
        Error  = error;
        Status = RetryCount >= 3 ? "Failed" : "Pending";
    }
}
