using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Application.Abstractions;

public interface INotificationRepository
{
    Task<EmailTemplate?> GetTemplateByEventTypeAsync(string eventType, CancellationToken ct = default);
    Task<List<EmailTemplate>> GetAllTemplatesAsync(CancellationToken ct = default);
    Task AddLogAsync(NotificationLog log, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
