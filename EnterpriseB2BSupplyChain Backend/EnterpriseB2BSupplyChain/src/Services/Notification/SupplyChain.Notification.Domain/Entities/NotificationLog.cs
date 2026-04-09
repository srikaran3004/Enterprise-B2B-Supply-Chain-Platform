namespace SupplyChain.Notification.Domain.Entities;

public class NotificationLog
{
    public Guid      LogId          { get; private set; }
    public string    EventType      { get; private set; } = string.Empty;
    public string    RecipientEmail { get; private set; } = string.Empty;
    public string    Subject        { get; private set; } = string.Empty;
    public string    Status         { get; private set; } = "Pending";
    public string?   ErrorMessage   { get; private set; }
    public DateTime  CreatedAt      { get; private set; }
    public DateTime? SentAt         { get; private set; }

    private NotificationLog() { }

    public static NotificationLog Create(string eventType, string recipientEmail, string subject)
        => new()
        {
            LogId          = Guid.NewGuid(),
            EventType      = eventType,
            RecipientEmail = recipientEmail,
            Subject        = subject,
            Status         = "Pending",
            CreatedAt      = DateTime.UtcNow
        };

    public void MarkSent()
    {
        Status = "Sent";
        SentAt = DateTime.UtcNow;
    }

    public void MarkFailed(string error)
    {
        Status       = "Failed";
        ErrorMessage = error;
    }
}
