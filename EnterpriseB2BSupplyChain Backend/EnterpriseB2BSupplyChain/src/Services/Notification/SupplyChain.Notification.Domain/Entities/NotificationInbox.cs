namespace SupplyChain.Notification.Domain.Entities;

public class NotificationInbox
{
    public Guid        NotificationId { get; private set; }
    public Guid        DealerId       { get; private set; }
    public string      Title          { get; private set; } = string.Empty;
    public string      Message        { get; private set; } = string.Empty;
    public string      Type           { get; private set; } = string.Empty; // e.g. "Order", "Payment", "General"
    public bool        IsRead         { get; private set; }
    public DateTime    CreatedAt      { get; private set; }

    private NotificationInbox() { }

    public static NotificationInbox Create(Guid dealerId, string title, string message, string type)
        => new()
        {
            NotificationId = Guid.NewGuid(),
            DealerId       = dealerId,
            Title          = title.Trim(),
            Message        = message.Trim(),
            Type           = type.Trim(),
            IsRead         = false,
            CreatedAt      = DateTime.UtcNow
        };

    public void MarkAsRead() => IsRead = true;
}
