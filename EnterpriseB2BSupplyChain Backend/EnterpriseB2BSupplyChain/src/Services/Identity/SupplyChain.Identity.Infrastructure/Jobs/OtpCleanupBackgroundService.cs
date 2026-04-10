using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.Identity.Infrastructure.Persistence;

namespace SupplyChain.Identity.Infrastructure.Jobs;

internal sealed class OtpCleanupBackgroundService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OtpCleanupBackgroundService> _logger;
    private readonly int _usedOtpGraceMinutes;

    public OtpCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<OtpCleanupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _usedOtpGraceMinutes = Math.Clamp(
            configuration.GetValue<int?>("Cleanup:UsedOtpGraceMinutes") ?? 60,
            5,
            1440);
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
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

            var now = DateTime.UtcNow;
            var usedOtpCutoff = now.AddMinutes(-_usedOtpGraceMinutes);

            var deleted = await db.OtpRecords
                .Where(o => o.ExpiresAt <= now || (o.IsUsed && o.CreatedAt <= usedOtpCutoff))
                .ExecuteDeleteAsync(ct);

            if (deleted > 0)
            {
                _logger.LogInformation("OTP cleanup removed {DeletedCount} stale records.", deleted);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OTP cleanup failed.");
        }
    }
}
