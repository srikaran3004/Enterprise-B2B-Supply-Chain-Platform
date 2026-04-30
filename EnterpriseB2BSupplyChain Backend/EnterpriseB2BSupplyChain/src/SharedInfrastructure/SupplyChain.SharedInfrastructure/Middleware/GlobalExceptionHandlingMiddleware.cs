using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Exceptions;
using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.SharedInfrastructure.Middleware;

/// <summary>
/// Converts unhandled exceptions into a consistent API error response.
/// </summary>
public sealed class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GlobalExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
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
                if (ex is OperationCanceledException || context.RequestAborted.IsCancellationRequested)
                {
                    _logger.LogInformation(
                        "Request {Method} {Path} was canceled after response started. CorrelationId={CorrelationId}",
                        context.Request.Method,
                        context.Request.Path.Value,
                        context.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid) ? cid as string : null);
                    return;
                }

                _logger.LogWarning(
                    ex,
                    "An exception occurred after the response had already started writing. Re-throwing.");
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

        // Do not write body for canceled requests.
        if (statusCode == 499 || context.RequestAborted.IsCancellationRequested)
        {
            if (!context.Response.HasStarted)
                context.Response.StatusCode = 499;

            _logger.LogInformation(
                "Request {Method} {Path} was canceled by client. CorrelationId={CorrelationId}",
                context.Request.Method,
                context.Request.Path.Value,
                correlationId);
            return;
        }

        _logger.Log(
            logLevel,
            exception,
            "Request {Method} {Path} failed with {StatusCode}: {ErrorCode} — {Message} | CorrelationId={CorrelationId}",
            context.Request.Method,
            context.Request.Path.Value,
            statusCode,
            error.Code,
            error.Message,
            correlationId);

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = ApiResponse<object>.Fail(error, correlationId, traceId);
        var json = JsonSerializer.Serialize(payload, _jsonOptions);

        try
        {
            await context.Response.WriteAsync(json, context.RequestAborted);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation(
                "Response write canceled for {Method} {Path}. CorrelationId={CorrelationId}",
                context.Request.Method,
                context.Request.Path.Value,
                correlationId);
        }
    }

    private (int StatusCode, ApiError Error, LogLevel LogLevel) MapException(Exception exception)
    {
        ArgumentNullException.ThrowIfNull(exception);

        switch (exception)
        {
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

            // Reflection keeps this middleware independent from direct package references.
            case object when exception.GetType().FullName == "FluentValidation.ValidationException":
                return HandleFluentValidationException(exception);

            case object when exception.GetType().FullName == "Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException":
                return (
                    409,
                    new ApiError
                    {
                        Code = "CONCURRENCY_CONFLICT",
                        Message = "The resource was modified by another operation. Please refresh and try again."
                    },
                    LogLevel.Warning);

            // Supports per-service DomainException without hard project references.
            case object when IsDomainException(exception):
                return (
                    400,
                    new ApiError
                    {
                        Code = ExtractDomainCode(exception) ?? "DOMAIN_ERROR",
                        Message = exception.Message
                    },
                    LogLevel.Warning);

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
        var errorsProp = exception.GetType().GetProperty("Errors");
        var fieldErrors = new Dictionary<string, List<string>>();

        if (errorsProp?.GetValue(exception) is System.Collections.IEnumerable errors)
        {
            foreach (var err in errors)
            {
                var propName = err?.GetType().GetProperty("PropertyName")?.GetValue(err) as string ?? "";
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

/**
 * This middleware provides centralized exception handling 
 * and ensures all error responses follow a standardized response envelope format, 
 * making API responses consistent and easier for frontend consumption.
 * */