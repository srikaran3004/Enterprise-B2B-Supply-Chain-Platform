using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Infrastructure.Jobs;

internal sealed class RefreshTokenCleanupBackgroundService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupBackgroundService> _logger;
    private readonly int _revokedRefreshTokenGraceDays;

    public RefreshTokenCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<RefreshTokenCleanupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _revokedRefreshTokenGraceDays = Math.Clamp(
            configuration.GetValue<int?>("Cleanup:RevokedRefreshTokenGraceDays") ?? 14,
            1,
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
            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var now = DateTime.UtcNow;
            var revokedBeforeUtc = now.AddDays(-_revokedRefreshTokenGraceDays);

            var deleted = await userRepository.CleanupStaleRefreshTokensAsync(now, revokedBeforeUtc, ct);
            if (deleted > 0)
            {
                _logger.LogInformation("Refresh token cleanup removed {DeletedCount} stale records.", deleted);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Refresh token cleanup failed.");
        }
    }
}
