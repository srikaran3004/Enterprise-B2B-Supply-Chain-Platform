using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace SupplyChain.SharedInfrastructure.Observability;

/// <summary>
/// Pushes request-level context values into Serilog's LogContext so all logs
/// in the request scope include user and request path metadata.
/// </summary>
public sealed class RequestContextEnrichmentMiddleware
{
    private readonly RequestDelegate _next;

    public RequestContextEnrichmentMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var userId =
            context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value
            ?? "anonymous";

        var requestPath = context.Request.Path.HasValue
            ? context.Request.Path.Value!
            : "/";

        using (LogContext.PushProperty(LogContextKeys.UserId, userId))
        using (LogContext.PushProperty(LogContextKeys.RequestPath, requestPath))
        {
            await _next(context);
        }
    }
}

