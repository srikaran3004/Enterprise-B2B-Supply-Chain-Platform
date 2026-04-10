using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.Notification.Infrastructure.Persistence;

namespace SupplyChain.Notification.Infrastructure.Jobs;

internal sealed class NotificationLogCleanupBackgroundService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(12);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationLogCleanupBackgroundService> _logger;
    private readonly int _retentionDays;

    public NotificationLogCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<NotificationLogCleanupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retentionDays = Math.Clamp(
            configuration.GetValue<int?>("Cleanup:NotificationLogRetentionDays") ?? 30,
            7,
            90);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupAsync(stoppingToken);

        using var timer = new PeriodicTimer(CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupAsync(stoppingToken);
        }
    }

    private async Task CleanupAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();

            var cutoff = DateTime.UtcNow.AddDays(-_retentionDays);

            var deleted = await db.NotificationLogs
                .Where(l => l.CreatedAt < cutoff && (l.Status == "Sent" || l.Status == "Failed"))
                .ExecuteDeleteAsync(ct);

            if (deleted > 0)
            {
                _logger.LogInformation(
                    "Notification log cleanup removed {DeletedCount} records older than {RetentionDays} days.",
                    deleted,
                    _retentionDays);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Notification log cleanup failed.");
        }
    }
}
