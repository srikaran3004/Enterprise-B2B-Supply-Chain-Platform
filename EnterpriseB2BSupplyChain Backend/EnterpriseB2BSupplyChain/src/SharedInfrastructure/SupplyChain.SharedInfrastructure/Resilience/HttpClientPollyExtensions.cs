using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;
using Polly.Timeout;

namespace SupplyChain.SharedInfrastructure.Resilience;

/// <summary>
/// Adds a safe default resilience stack for downstream HTTP calls:
/// retry (with backoff), circuit breaker, and timeout.
/// </summary>
public static class HttpClientPollyExtensions
{
    public static IHttpClientBuilder AddStandardResiliencePolicies(
        this IHttpClientBuilder builder,
        int retryCount = 3,
        int timeoutSeconds = 10,
        int exceptionsAllowedBeforeBreaking = 5,
        int circuitBreakSeconds = 30)
    {
        ArgumentNullException.ThrowIfNull(builder);

        IAsyncPolicy<HttpResponseMessage> retryPolicy = HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(response => response.StatusCode == HttpStatusCode.TooManyRequests)
            .WaitAndRetryAsync(retryCount, attempt =>
                TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt - 1)));

        IAsyncPolicy<HttpResponseMessage> circuitBreakerPolicy = HttpPolicyExtensions
            .HandleTransientHttpError()
            .Or<TimeoutRejectedException>()
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: exceptionsAllowedBeforeBreaking,
                durationOfBreak: TimeSpan.FromSeconds(circuitBreakSeconds));

        IAsyncPolicy<HttpResponseMessage> timeoutPolicy =
            Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(timeoutSeconds));

        return builder
            .AddPolicyHandler(retryPolicy)
            .AddPolicyHandler(circuitBreakerPolicy)
            .AddPolicyHandler(timeoutPolicy);
    }
}
