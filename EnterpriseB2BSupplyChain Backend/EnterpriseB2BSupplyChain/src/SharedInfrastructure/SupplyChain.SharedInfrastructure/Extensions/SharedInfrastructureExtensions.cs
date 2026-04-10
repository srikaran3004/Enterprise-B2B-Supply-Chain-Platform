using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Middleware;
using SupplyChain.SharedInfrastructure.Observability;
using SupplyChain.SharedInfrastructure.Security;
using System.Threading.RateLimiting;

namespace SupplyChain.SharedInfrastructure.Extensions;

/// <summary>
/// Single-entry-point extension methods that every microservice uses to wire up
/// the shared infrastructure layer. Keeps <c>Program.cs</c> changes to one line of
/// service registration and one line of middleware registration per service.
/// </summary>
public static class SharedInfrastructureExtensions
{
    /// <summary>
    /// Registers all services required by the shared infrastructure pipeline
    /// (HttpContextAccessor, correlation accessor, internal auth helper,
    /// response envelope filter, platform rate limiting, and background log retention cleanup).
    /// Call this in <c>Program.cs</c> BEFORE <c>AddApplication</c>/<c>AddInfrastructure</c>.
    /// </summary>
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<ICorrelationIdAccessor, CorrelationIdAccessor>();
        services.AddTransient<CorrelationIdDelegatingHandler>();
        services.AddScoped<ApiResponseEnvelopeFilter>();
        services.Configure<MvcOptions>(options => options.Filters.AddService<ApiResponseEnvelopeFilter>());
        services.AddSingleton<IInternalServiceTokenProvider, InternalServiceTokenProvider>();
        services.AddHostedService<LogRetentionCleanupService>();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var path = context.Request.Path.Value ?? string.Empty;
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
                var subject = context.User.FindFirst("sub")?.Value
                           ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var identityKey = string.IsNullOrWhiteSpace(subject) ? ip : subject;

                var isAuthPath =
                    path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                    path.StartsWith("/api/auth/register", StringComparison.OrdinalIgnoreCase) ||
                    path.StartsWith("/api/auth/forgot-password", StringComparison.OrdinalIgnoreCase);

                if (isAuthPath)
                {
                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: $"auth:{identityKey}",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        });
                }

                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"default:{identityKey}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 600,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    });
            });
        });

        return services;
    }

    /// <summary>
    /// Registers the shared infrastructure request pipeline:
    /// <list type="number">
    ///   <item><description><see cref="CorrelationIdMiddleware"/> - reads/generates the correlation ID.</description></item>
    ///   <item><description>Platform rate limiting middleware.</description></item>
    ///   <item><description><see cref="RequestContextEnrichmentMiddleware"/> - enriches logs with user and request path.</description></item>
    ///   <item><description><see cref="GlobalExceptionHandlingMiddleware"/> - central exception handler.</description></item>
    /// </list>
    /// Call this in <c>Program.cs</c> as the FIRST pipeline call - before UseCors,
    /// UseSerilogRequestLogging, UseAuthentication, UseAuthorization, MapControllers.
    /// </summary>
    public static IApplicationBuilder UseSharedInfrastructure(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseRateLimiter();
        app.UseMiddleware<RequestContextEnrichmentMiddleware>();
        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
        return app;
    }
}

