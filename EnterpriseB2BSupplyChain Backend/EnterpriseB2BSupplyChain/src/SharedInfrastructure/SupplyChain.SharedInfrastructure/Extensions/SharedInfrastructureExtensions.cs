using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Middleware;
using SupplyChain.SharedInfrastructure.Observability;
using SupplyChain.SharedInfrastructure.RateLimiting;
using SupplyChain.SharedInfrastructure.Security;
using System.Threading.RateLimiting;

namespace SupplyChain.SharedInfrastructure.Extensions;

/// <summary>
/// Single-entry-point extension methods to wire shared platform behavior
/// into every microservice with two lines in Program.cs.
/// </summary>
public static class SharedInfrastructureExtensions
{
    /// <summary>
    /// Registers cross-cutting services used by all APIs.
    /// Must run before Application/Infrastructure registrations.
    /// </summary>
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();

        // Correlation ID plumbing (read from request, access anywhere, forward on HttpClient calls).
        services.AddSingleton<ICorrelationIdAccessor, CorrelationIdAccessor>();
        // Automatically attaches correlation ID to outgoing HTTP calls.
        services.AddTransient<CorrelationIdDelegatingHandler>();

        // Auto-wrap successful controller responses in standard ApiResponse envelope.
        services.AddScoped<ApiResponseEnvelopeFilter>();
        services.Configure<MvcOptions>(options => options.Filters.AddService<ApiResponseEnvelopeFilter>());

        // Internal JWT helper for service-to-service calls.
        services.AddSingleton<IInternalServiceTokenProvider, InternalServiceTokenProvider>();

        // Background cleanup for old log files.
        services.AddHostedService<LogRetentionCleanupService>();

        // Global rate limiting — Redis-backed distributed limiter so all horizontal
        // replicas share the same bucket per user/IP, preventing bypass via scale-out.
        // Gracefully falls back to in-process FixedWindow when Redis is not registered.
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var path    = context.Request.Path.Value ?? string.Empty;
                var ip      = context.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
                var subject = context.User.FindFirst("sub")?.Value
                           ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var identityKey = string.IsNullOrWhiteSpace(subject) ? ip : subject;

                var redis  = context.RequestServices.GetService<IConnectionMultiplexer>();
                var logger = context.RequestServices.GetService<ILogger<RedisRateLimiter>>();

                var isAuthPath =
                    path.StartsWith("/api/auth/login",           StringComparison.OrdinalIgnoreCase) ||
                    path.StartsWith("/api/auth/register",        StringComparison.OrdinalIgnoreCase) ||
                    path.StartsWith("/api/auth/forgot-password", StringComparison.OrdinalIgnoreCase);

                if (isAuthPath)
                {
                    // Strict: 30 requests / minute per identity.
                    if (redis is not null)
                        return RateLimitPartition.Get(
                            partitionKey: $"rl:auth:{identityKey}",
                            factory: key => new RedisRateLimiter(key, redis, logger,
                                permitLimit: 30, windowSeconds: 60));

                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: $"auth:{identityKey}",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit       = 30,
                            Window            = TimeSpan.FromMinutes(1),
                            QueueLimit        = 0,
                            AutoReplenishment = true
                        });
                }

                // Normal API: 600 requests / minute per identity.
                if (redis is not null)
                    return RateLimitPartition.Get(
                        partitionKey: $"rl:default:{identityKey}",
                        factory: key => new RedisRateLimiter(key, redis, logger,
                            permitLimit: 600, windowSeconds: 60));

                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"default:{identityKey}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit       = 600,
                        Window            = TimeSpan.FromMinutes(1),
                        QueueLimit        = 0,
                        AutoReplenishment = true
                    });
            });
        });

        return services;
    }

    /// <summary>
    /// Adds shared middleware in required order.
    /// Should be called first in the HTTP pipeline.
    /// </summary>
    public static IApplicationBuilder UseSharedInfrastructure(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();             // 1) Ensure every request has a correlation id.
        app.UseRateLimiter();                                     // 2) Enforce request throttling.
        app.UseMiddleware<RequestContextEnrichmentMiddleware>();  // 3) Add user/path metadata to logs.
        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();   // 4) Convert exceptions to uniform error payloads.
        return app;
    }
}

/**
 This shared infrastructure layer centralizes common cross-cutting concerns for all microservices,
including correlation ID tracing, distributed rate limiting, global exception handling,
request enrichment, standardized API responses, internal service authentication,
and log cleanup. It helps maintain consistency and reduces repeated boilerplate code across services.
 * */