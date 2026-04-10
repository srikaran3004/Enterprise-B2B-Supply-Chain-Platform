namespace SupplyChain.Logistics.Domain.Entities;

public class ConsumedMessage
{
    public Guid MessageLogId { get; private set; }
    public string MessageId { get; private set; } = string.Empty;
    public string Consumer { get; private set; } = string.Empty;
    public string EventType { get; private set; } = string.Empty;
    public string? CorrelationId { get; private set; }
    public DateTime ProcessedAtUtc { get; private set; }

    private ConsumedMessage() { }

    public static ConsumedMessage Create(
        string messageId,
        string consumer,
        string eventType,
        string? correlationId)
    {
        return new ConsumedMessage
        {
            MessageLogId = Guid.NewGuid(),
            MessageId = messageId,
            Consumer = consumer,
            EventType = eventType,
            CorrelationId = correlationId,
            ProcessedAtUtc = DateTime.UtcNow
        };
    }
}
