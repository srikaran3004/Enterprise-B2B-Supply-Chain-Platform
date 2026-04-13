using System.Net.Http;

namespace SupplyChain.SharedInfrastructure.Correlation;

/// <summary>
/// Propagates correlation id from current request to outbound HttpClient calls.
/// </summary>
public sealed class CorrelationIdDelegatingHandler : DelegatingHandler
{
    private readonly ICorrelationIdAccessor _accessor;

    public CorrelationIdDelegatingHandler(ICorrelationIdAccessor accessor)
    {
        _accessor = accessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var correlationId = _accessor.CorrelationId;

        // Add header only if available and not already set by caller.
        if (!string.IsNullOrWhiteSpace(correlationId) && !request.Headers.Contains(CorrelationIdMiddleware.HeaderName))
        {
            request.Headers.TryAddWithoutValidation(CorrelationIdMiddleware.HeaderName, correlationId);
        }

        return base.SendAsync(request, cancellationToken);
    }
}

/**
 * This delegating handler propagates the current request’s correlation ID into outbound 
 * HTTP client requests so distributed tracing remains consistent across microservices.
 * */

