using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.SharedInfrastructure.Middleware;

/// <summary>
/// Wraps successful API results in the standard ApiResponse envelope.
/// </summary>
public sealed class ApiResponseEnvelopeFilter : IAsyncResultFilter
{
    public Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (ShouldSkip(context.Result))
            return next();

        var correlationId = context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid)
            ? cid?.ToString()
            : null;
        var traceId = context.HttpContext.TraceIdentifier;

        if (context.Result is ObjectResult objectResult)
        {
            var statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;

            // Wrap only successful non-enveloped payloads.
            if (statusCode is >= 200 and < 300 && !IsApiResponse(objectResult.Value))
                objectResult.Value = ApiResponse<object?>.Ok(objectResult.Value, correlationId, traceId);

            return next();
        }

        if (context.Result is JsonResult jsonResult && !IsApiResponse(jsonResult.Value))
        {
            jsonResult.Value = ApiResponse<object?>.Ok(jsonResult.Value, correlationId, traceId);
            return next();
        }

        if (context.Result is EmptyResult)
        {
            context.Result = new OkObjectResult(ApiResponse.Ok(correlationId, traceId));
            return next();
        }

        return next();
    }

    private static bool ShouldSkip(IActionResult result)
    {
        // Skip result types that should not be envelope-wrapped.
        return result is FileResult
            || result is ChallengeResult
            || result is ForbidResult
            || result is RedirectResult
            || result is RedirectToActionResult
            || result is RedirectToRouteResult
            || result is RedirectToPageResult;
    }

    private static bool IsApiResponse(object? value)
    {
        if (value is null)
            return false;

        var type = value.GetType();
        if (type == typeof(ApiResponse))
            return true;

        return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(ApiResponse<>);
    }
}
