using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SupplyChain.Order.Infrastructure.Persistence;

namespace SupplyChain.Order.Infrastructure.Jobs;

public class OutboxCleanupJob
{
    private readonly OrderDbContext _dbContext;
    private readonly ILogger<OutboxCleanupJob> _logger;
    private readonly int _retentionDays;

    public OutboxCleanupJob(
        OrderDbContext dbContext,
        IConfiguration configuration,
        ILogger<OutboxCleanupJob> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
        _retentionDays = Math.Clamp(
            configuration.GetValue<int?>("Cleanup:OutboxRetentionDays") ?? 14,
            1,
            90);
    }

    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-_retentionDays);

        var deleted = await _dbContext.OutboxMessages
            .Where(m => (m.Status == "Published" || m.Status == "Failed")
                     && (m.PublishedAt ?? m.CreatedAt) < cutoff)
            .ExecuteDeleteAsync(ct);

        if (deleted > 0)
        {
            _logger.LogInformation(
                "Outbox cleanup removed {DeletedCount} messages older than {RetentionDays} days.",
                deleted,
                _retentionDays);
        }
    }
}
