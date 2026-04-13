using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace SupplyChain.SharedInfrastructure.Correlation;

/// <summary>
/// Ensures every request has a correlation id and keeps it visible
/// in response headers + Serilog context for end-to-end tracing.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-ID";
    internal const string ItemKey  = "__CorrelationId";

    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        //Did client sent ID, if not generate new one.
        var correlationId = ResolveCorrelationId(context);

        // Make correlation id available to downstream middleware/services.
        context.Items[ItemKey] = correlationId;

        // Echo id in response so clients can attach it to bug reports/support tickets.
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(HeaderName))
                context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        // Enrich all request-scope logs with CorrelationId.
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        // Reuse incoming id if caller already started a trace.
        if (context.Request.Headers.TryGetValue(HeaderName, out var headerValue))
        {
            var incoming = headerValue.ToString();
            if (!string.IsNullOrWhiteSpace(incoming))
                return incoming.Trim();
        }

        // Otherwise create a new trace id for this request.
        return Guid.NewGuid().ToString("N");
    }
}


