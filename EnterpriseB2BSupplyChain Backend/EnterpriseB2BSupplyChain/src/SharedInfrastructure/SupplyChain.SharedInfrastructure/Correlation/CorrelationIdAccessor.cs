using Microsoft.AspNetCore.Http;

namespace SupplyChain.SharedInfrastructure.Correlation;

/// <summary>
/// Abstraction to fetch current request correlation id from any layer.
/// </summary>
public interface ICorrelationIdAccessor
{
    /// <summary>Current correlation id, or null when no HTTP request scope exists.</summary>
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
            if (httpContext is null) return null; // Background job / non-request path.
            return httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var value)
                ? value as string
                : null;
        }
    }
}


