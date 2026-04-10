using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SupplyChain.SharedInfrastructure.Observability;

/// <summary>
/// Deletes dated log folders older than the configured retention window.
/// Folder format: yyyy-MM-dd under the configured LogsRoot.
/// </summary>
internal sealed class LogRetentionCleanupService : BackgroundService
{
    private const string DateFolderFormat = "yyyy-MM-dd";

    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly ILogger<LogRetentionCleanupService> _logger;

    public LogRetentionCleanupService(
        IConfiguration configuration,
        IHostEnvironment hostEnvironment,
        ILogger<LogRetentionCleanupService> logger)
    {
        _configuration = configuration;
        _hostEnvironment = hostEnvironment;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(12));
        while (!stoppingToken.IsCancellationRequested
               && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupAsync(stoppingToken);
        }
    }

    private Task CleanupAsync(CancellationToken ct)
    {
        if (ct.IsCancellationRequested)
        {
            return Task.CompletedTask;
        }

        var options = _configuration
                          .GetSection(ObservabilityOptions.SectionName)
                          .Get<ObservabilityOptions>()
                      ?? new ObservabilityOptions();

        if (!options.EnableFileLogging)
        {
            return Task.CompletedTask;
        }

        var retentionDays = Math.Clamp(options.RetentionDays, 7, 30);
        var logsRoot = ResolveLogsRoot(_hostEnvironment.ContentRootPath, options.LogsRoot);

        if (!Directory.Exists(logsRoot))
        {
            return Task.CompletedTask;
        }

        var cutoffDate = DateTime.UtcNow.Date.AddDays(-retentionDays);
        var deletedCount = 0;

        foreach (var folder in Directory.EnumerateDirectories(logsRoot))
        {
            var folderName = Path.GetFileName(folder);
            if (!DateTime.TryParseExact(
                    folderName,
                    DateFolderFormat,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var parsedDate))
            {
                continue;
            }

            if (parsedDate.Date >= cutoffDate)
            {
                continue;
            }

            try
            {
                Directory.Delete(folder, recursive: true);
                deletedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to delete expired log folder {LogFolder}.",
                    folder);
            }
        }

        if (deletedCount > 0)
        {
            _logger.LogInformation(
                "Log retention cleanup removed {FolderCount} folder(s) older than {RetentionDays} days from {LogsRoot}.",
                deletedCount,
                retentionDays,
                logsRoot);
        }

        return Task.CompletedTask;
    }

    private static string ResolveLogsRoot(string contentRootPath, string logsRoot)
    {
        if (Path.IsPathRooted(logsRoot))
        {
            return logsRoot;
        }

        return Path.GetFullPath(Path.Combine(contentRootPath, logsRoot));
    }
}

