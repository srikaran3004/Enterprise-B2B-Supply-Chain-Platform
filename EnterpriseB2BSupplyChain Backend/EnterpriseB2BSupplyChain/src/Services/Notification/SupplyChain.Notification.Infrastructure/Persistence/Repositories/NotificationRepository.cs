using Microsoft.EntityFrameworkCore;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly NotificationDbContext _context;

    public NotificationRepository(NotificationDbContext context) => _context = context;

    public async Task<EmailTemplate?> GetTemplateByEventTypeAsync(string eventType, CancellationToken ct = default)
        => await _context.EmailTemplates
            .FirstOrDefaultAsync(t => t.EventType == eventType && t.IsActive, ct);

    public async Task<List<EmailTemplate>> GetAllTemplatesAsync(CancellationToken ct = default)
        => await _context.EmailTemplates.OrderBy(t => t.EventType).ToListAsync(ct);

    public async Task AddLogAsync(NotificationLog log, CancellationToken ct = default)
        => await _context.NotificationLogs.AddAsync(log, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
