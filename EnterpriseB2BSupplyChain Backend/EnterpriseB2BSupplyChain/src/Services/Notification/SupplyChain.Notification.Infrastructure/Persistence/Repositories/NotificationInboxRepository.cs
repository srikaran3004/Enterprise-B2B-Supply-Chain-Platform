using Microsoft.EntityFrameworkCore;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Repositories;

public class NotificationInboxRepository : INotificationInboxRepository
{
    private readonly NotificationDbContext _context;

    public NotificationInboxRepository(NotificationDbContext context)
    {
        _context = context;
    }

    public async Task<List<NotificationInbox>> GetInboxAsync(Guid dealerId, CancellationToken ct = default)
    {
        return await _context.NotificationInbox
            .Where(n => n.DealerId == dealerId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50) // Return latest 50 for quick display
            .ToListAsync(ct);
    }

    public async Task<int> GetUnreadCountAsync(Guid dealerId, CancellationToken ct = default)
    {
        return await _context.NotificationInbox
            .CountAsync(n => n.DealerId == dealerId && !n.IsRead, ct);
    }

    public async Task MarkAsReadAsync(Guid notificationId, Guid dealerId, CancellationToken ct = default)
    {
        var notification = await _context.NotificationInbox
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.DealerId == dealerId, ct);

        if (notification != null && !notification.IsRead)
        {
            notification.MarkAsRead();
        }
    }

    public async Task MarkAllAsReadAsync(Guid dealerId, CancellationToken ct = default)
    {
        var unread = await _context.NotificationInbox
            .Where(n => n.DealerId == dealerId && !n.IsRead)
            .ToListAsync(ct);

        foreach (var notification in unread)
        {
            notification.MarkAsRead();
        }
    }

    public async Task AddAsync(NotificationInbox notification, CancellationToken ct = default)
    {
        await _context.NotificationInbox.AddAsync(notification, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
