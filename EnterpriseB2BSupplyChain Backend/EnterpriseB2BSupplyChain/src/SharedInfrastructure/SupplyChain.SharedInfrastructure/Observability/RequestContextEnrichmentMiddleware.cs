using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace SupplyChain.SharedInfrastructure.Observability;

/// <summary>
/// Adds user and path metadata to request-scope logs.
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
        // Prefer standard identity claims; fallback for unauthenticated calls.
        var userId =
            context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value
            ?? "anonymous";

        // Normalize path value for consistent logging.
        var requestPath = context.Request.Path.HasValue
            ? context.Request.Path.Value!
            : "/";

        // Every log inside this request will carry these properties.
        using (LogContext.PushProperty(LogContextKeys.UserId, userId))
        using (LogContext.PushProperty(LogContextKeys.RequestPath, requestPath))
        {
            await _next(context);
        }
    }
}


