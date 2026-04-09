using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace SupplyChain.Order.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next   = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException vex)
        {
            _logger.LogWarning(vex, "Validation failed");
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var errors = vex.Errors.Select(e => new { e.PropertyName, e.ErrorMessage });
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Message = "Validation failed",
                Errors = errors
            }));
        }
        catch (KeyNotFoundException knfEx)
        {
            _logger.LogWarning(knfEx, "Resource not found");
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Message = knfEx.Message
            }));
        }
        catch (Domain.Exceptions.DomainException dex)
        {
            _logger.LogWarning(dex, "Domain exception: {Code}", dex.Code);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Code = dex.Code,
                Message = dex.Message
            }));
        }
        catch (InvalidOperationException ioEx)
        {
            _logger.LogWarning(ioEx, "Operation conflict");
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Message = ioEx.Message
            }));
        }
        catch (DbUpdateConcurrencyException dbcx)
        {
            _logger.LogWarning(dbcx, "Database concurrency conflict");
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Message = "The order was changed by another process. Please refresh and try again."
            }));
        }
        catch (OperationCanceledException)
        {
            // Client disconnected / browser cancelled the request — not an error
            context.Response.StatusCode = 499; // Client Closed Request
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                Message = "An internal server error occurred. Please try again later.",
                Detail = _environment.IsDevelopment() ? ex.ToString() : null
            }));
        }
    }
}
