using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.BuildingBlocks.Correlation;
using SupplyChain.BuildingBlocks.Exceptions;
using SupplyChain.BuildingBlocks.Results;

namespace SupplyChain.BuildingBlocks.Middleware;

/// <summary>
/// Central exception handling middleware used by every microservice.
///
/// Translates exceptions into a uniform <see cref="ApiResponse{T}"/>-shaped JSON
/// payload with the correct HTTP status code. Handles:
/// <list type="bullet">
///   <item><description><see cref="AppException"/> (BuildingBlocks hierarchy) — uses its StatusCode + ErrorCode.</description></item>
///   <item><description><c>FluentValidation.ValidationException</c> — 400 with per-field errors.</description></item>
///   <item><description>Per-service <c>DomainException</c> (reflectively detected via a <c>Code</c> property) — 400.</description></item>
///   <item><description><see cref="KeyNotFoundException"/> — 404.</description></item>
///   <item><description><see cref="UnauthorizedAccessException"/> — 401.</description></item>
///   <item><description><c>DbUpdateConcurrencyException</c> (reflective EF detection) — 409.</description></item>
///   <item><description><see cref="InvalidOperationException"/> — 409.</description></item>
///   <item><description><see cref="OperationCanceledException"/> — 499 (non-standard, client-closed).</description></item>
///   <item><description>Anything else — 500 (detail hidden outside Development).</description></item>
/// </list>
///
/// The middleware is idempotent: if the response has already started writing,
/// it just re-throws so ASP.NET can log and terminate cleanly.
/// </summary>
public sealed class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public GlobalExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next        = next;
        _logger      = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogWarning(ex,
                    "An exception occurred after the response had already started writing. " +
                    "Re-throwing for the ASP.NET pipeline to handle.");
                throw;
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid)
            ? cid as string
            : null;
        var traceId = context.TraceIdentifier;

        var (statusCode, error, logLevel) = MapException(exception);

        // Log with appropriate level: 4xx = warning, 5xx = error.
        _logger.Log(logLevel, exception,
            "Request {Method} {Path} failed with {StatusCode}: {ErrorCode} — {Message} | CorrelationId={CorrelationId}",
            context.Request.Method, context.Request.Path.Value, statusCode, error.Code, error.Message, correlationId);

        context.Response.Clear();
        context.Response.StatusCode  = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = ApiResponse<object>.Fail(error, correlationId, traceId);
        var json    = JsonSerializer.Serialize(payload, _jsonOptions);
        await context.Response.WriteAsync(json, context.RequestAborted);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Exception → (StatusCode, ApiError, LogLevel)
    // ──────────────────────────────────────────────────────────────────────

    private (int StatusCode, ApiError Error, LogLevel LogLevel) MapException(Exception exception)
    {
        ArgumentNullException.ThrowIfNull(exception);

        switch (exception)
        {
            // 1. BuildingBlocks AppException hierarchy ──────────────────
            case ValidationAppException ve:
                return (
                    ve.StatusCode,
                    ApiError.Validation(ve.Message, ve.FieldErrors),
                    LogLevel.Warning);

            case AppException ae:
                return (
                    ae.StatusCode,
                    new ApiError { Code = ae.ErrorCode, Message = ae.Message },
                    ae.StatusCode >= 500 ? LogLevel.Error : LogLevel.Warning);

            // 2. FluentValidation.ValidationException ────────────────────
            case object when exception.GetType().FullName == "FluentValidation.ValidationException":
                return HandleFluentValidationException(exception);

            // 3. EF Core DbUpdateConcurrencyException (via reflection) ───
            case object when exception.GetType().FullName == "Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException":
                return (
                    409,
                    new ApiError
                    {
                        Code    = "CONCURRENCY_CONFLICT",
                        Message = "The resource was modified by another operation. Please refresh and try again."
                    },
                    LogLevel.Warning);

            // 4. Per-service DomainException — any class whose type name ends with
            //    "DomainException" and has a string "Code" property. This avoids
            //    a hard reference to any individual service's Domain project.
            case object when IsDomainException(exception):
                return (
                    400,
                    new ApiError
                    {
                        Code    = ExtractDomainCode(exception) ?? "DOMAIN_ERROR",
                        Message = exception.Message
                    },
                    LogLevel.Warning);

            // 5. Common BCL exceptions ───────────────────────────────────
            case KeyNotFoundException:
                return (
                    404,
                    new ApiError { Code = "NOT_FOUND", Message = exception.Message },
                    LogLevel.Warning);

            case UnauthorizedAccessException:
                return (
                    401,
                    new ApiError { Code = "UNAUTHORIZED", Message = exception.Message },
                    LogLevel.Warning);

            case InvalidOperationException:
                return (
                    409,
                    new ApiError { Code = "CONFLICT", Message = exception.Message },
                    LogLevel.Warning);

            case OperationCanceledException:
                return (
                    499,
                    new ApiError { Code = "CANCELLED", Message = "The request was cancelled." },
                    LogLevel.Information);

            // 6. Everything else is a true server error ─────────────────
            default:
                var serverMessage = _environment.IsDevelopment()
                    ? (exception?.Message ?? "An unexpected error occurred.")
                    : "An unexpected error occurred. Please try again later.";
                return (
                    500,
                    new ApiError { Code = "INTERNAL_ERROR", Message = serverMessage },
                    LogLevel.Error);
        }
    }

    private static (int, ApiError, LogLevel) HandleFluentValidationException(Exception exception)
    {
        // Reflectively pull out the Errors collection without taking a
        // compile-time dependency on FluentValidation — keeps this middleware
        // usable in services that don't reference FluentValidation (e.g. Notification).
        var errorsProp = exception.GetType().GetProperty("Errors");
        var fieldErrors = new Dictionary<string, List<string>>();

        if (errorsProp?.GetValue(exception) is System.Collections.IEnumerable errors)
        {
            foreach (var err in errors)
            {
                var propName    = err?.GetType().GetProperty("PropertyName")?.GetValue(err) as string ?? "";
                var errorMessage = err?.GetType().GetProperty("ErrorMessage")?.GetValue(err) as string ?? "";
                if (!fieldErrors.ContainsKey(propName))
                    fieldErrors[propName] = new List<string>();
                fieldErrors[propName].Add(errorMessage);
            }
        }

        var dict = fieldErrors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToArray());
        return (
            400,
            ApiError.Validation("One or more validation errors occurred.", dict),
            LogLevel.Warning);
    }

    private static bool IsDomainException(Exception exception)
    {
        var typeName = exception.GetType().Name;
        return typeName == "DomainException" || typeName.EndsWith("DomainException");
    }

    private static string? ExtractDomainCode(Exception exception)
    {
        var codeProp = exception.GetType().GetProperty("Code");
        return codeProp?.GetValue(exception) as string;
    }
}
