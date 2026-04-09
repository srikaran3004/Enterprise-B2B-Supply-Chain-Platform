using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Application.Abstractions;

public interface INotificationInboxRepository
{
    Task<List<NotificationInbox>> GetInboxAsync(Guid dealerId, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(Guid dealerId, CancellationToken ct = default);
    Task MarkAsReadAsync(Guid notificationId, Guid dealerId, CancellationToken ct = default);
    Task MarkAllAsReadAsync(Guid dealerId, CancellationToken ct = default);
    Task AddAsync(NotificationInbox notification, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
