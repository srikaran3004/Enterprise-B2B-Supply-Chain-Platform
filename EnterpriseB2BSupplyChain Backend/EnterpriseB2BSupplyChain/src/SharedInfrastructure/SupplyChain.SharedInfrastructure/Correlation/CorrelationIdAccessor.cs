using Microsoft.AspNetCore.Http;

namespace SupplyChain.SharedInfrastructure.Correlation;

/// <summary>
/// Exposes the current request's correlation ID to any layer of the app
/// (handlers, repositories, domain services, etc.) without taking a direct
/// dependency on <c>IHttpContextAccessor</c>.
/// </summary>
public interface ICorrelationIdAccessor
{
    /// <summary>The active correlation ID for the current request, or null if called outside an HTTP request.</summary>
    string? CorrelationId { get; }
}

internal sealed class CorrelationIdAccessor : ICorrelationIdAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CorrelationIdAccessor(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    public string? CorrelationId
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null) return null;
            return httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var value)
                ? value as string
                : null;
        }
    }
}

