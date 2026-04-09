namespace SupplyChain.Notification.Domain.Entities;

public class EmailTemplate
{
    public Guid      TemplateId     { get; private set; }
    public string    EventType      { get; private set; } = string.Empty;
    public string    Subject        { get; private set; } = string.Empty;
    public string    HtmlBody       { get; private set; } = string.Empty;
    public bool      IsActive       { get; private set; }
    public DateTime? UpdatedAt      { get; private set; }

    private EmailTemplate() { }

    public static EmailTemplate Create(string eventType, string subject, string htmlBody)
        => new()
        {
            TemplateId = Guid.NewGuid(),
            EventType  = eventType,
            Subject    = subject,
            HtmlBody   = htmlBody,
            IsActive   = true
        };

    public void Update(string subject, string htmlBody)
    {
        Subject   = subject;
        HtmlBody  = htmlBody;
        UpdatedAt = DateTime.UtcNow;
    }
}
