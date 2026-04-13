using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace SupplyChain.SharedInfrastructure.Observability;

public static class SharedSerilogHostBuilderExtensions
{
    public static IHostBuilder UseSharedSerilog(this IHostBuilder hostBuilder, string serviceName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(serviceName);

        return hostBuilder.UseSerilog((ctx, _, loggerConfiguration) =>
        {
            var options = ctx.Configuration
                              .GetSection(ObservabilityOptions.SectionName)
                              .Get<ObservabilityOptions>()
                          ?? new ObservabilityOptions();

            var logsRoot = ResolveLogsRoot(ctx.HostingEnvironment.ContentRootPath, options.LogsRoot);
            var serviceFileName = $"{NormalizeServiceName(serviceName)}.log";
            var todayFolder = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var filePath = Path.Combine(logsRoot, todayFolder, serviceFileName);

            var outputTemplate =
                "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] " +
                "[{ServiceName}] [{CorrelationId}] [{UserId}] [{RequestPath}] {Message:lj}{NewLine}{Exception}";

            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

            loggerConfiguration
                .ReadFrom.Configuration(ctx.Configuration)
                .Enrich.FromLogContext()
                .Enrich.WithProperty(LogContextKeys.ServiceName, serviceName)
                .WriteTo.Console(outputTemplate: outputTemplate);

            // File logging is optional via configuration.
            if (options.EnableFileLogging)
            {
                loggerConfiguration.WriteTo.File(
                    path: filePath,
                    restrictedToMinimumLevel: LogEventLevel.Information,
                    rollingInterval: RollingInterval.Infinite,
                    rollOnFileSizeLimit: true,
                    fileSizeLimitBytes: 20 * 1024 * 1024,
                    retainedFileCountLimit: null,
                    shared: true,
                    flushToDiskInterval: TimeSpan.FromSeconds(1),
                    outputTemplate: outputTemplate);
            }
        });
    }

    private static string ResolveLogsRoot(string contentRootPath, string logsRoot)
    {
        // Support both absolute and project-relative log paths.
        if (Path.IsPathRooted(logsRoot))
            return logsRoot;

        return Path.GetFullPath(Path.Combine(contentRootPath, logsRoot));
    }

    private static string NormalizeServiceName(string serviceName)
    {
        // Keeps log file naming stable across spaces/underscores/dots.
        return string.Join(
            "-",
            serviceName
                .Trim()
                .ToLowerInvariant()
                .Split(new[] { ' ', '_', '.' }, StringSplitOptions.RemoveEmptyEntries));
    }
}


/**
 * This extension method configures a common/shared Serilog logging setup for all microservices, 
 * including console logging, optional file logging, log formatting, 
 * service name enrichment, and log storage path handling.
 * */