using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace SupplyChain.SharedInfrastructure.Correlation;

/// <summary>
/// Reads an incoming <c>X-Correlation-ID</c> header (or generates a new GUID if missing),
/// stores it on <see cref="HttpContext.Items"/>, echoes it back on the response via the
/// same header, and pushes it onto Serilog's <see cref="LogContext"/> so every log line
/// for this request is automatically enriched with the correlation ID.
///
/// Place this as the FIRST middleware in the pipeline so all downstream middleware,
/// controllers, and handlers â€” including the exception handler â€” see the correlation ID.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-ID";
    internal const string ItemKey  = "__CorrelationId";

    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = ResolveCorrelationId(context);

        // Stash on HttpContext so ICorrelationIdAccessor can surface it anywhere.
        context.Items[ItemKey] = correlationId;

        // Echo in the response headers so the client can capture and surface it in
        // support tickets / UI. OnStarting guarantees the header is written before
        // the response body begins streaming.
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(HeaderName))
                context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        // Push onto Serilog's logical context so every log line in this request
        // carries {CorrelationId} â€” works seamlessly with UseSerilogRequestLogging.
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        // Prefer an incoming X-Correlation-ID header if the caller already has one
        // (e.g. the Angular frontend or another microservice forwarding a trace).
        if (context.Request.Headers.TryGetValue(HeaderName, out var headerValue))
        {
            var incoming = headerValue.ToString();
            if (!string.IsNullOrWhiteSpace(incoming))
                return incoming.Trim();
        }

        // Fall back to a short GUID â€” no dashes, lowercased, first 32 chars.
        return Guid.NewGuid().ToString("N");
    }
}

