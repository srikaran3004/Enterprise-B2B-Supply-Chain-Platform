using Microsoft.EntityFrameworkCore;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options)
        : base(options) { }

    public DbSet<EmailTemplate>   EmailTemplates   => Set<EmailTemplate>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<NotificationInbox> NotificationInbox => Set<NotificationInbox>();
    public DbSet<ConsumedMessage> ConsumedMessages => Set<ConsumedMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(NotificationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
