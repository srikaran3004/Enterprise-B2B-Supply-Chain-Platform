using System.Text.Json.Serialization;

namespace SupplyChain.SharedInfrastructure.Results;

/// <summary>
/// Standard error payload used inside ApiResponse when a request fails.
/// </summary>
public sealed class ApiError
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("message")]
    public required string Message { get; init; }

    // Optional field-level errors (mainly for validation failures).
    [JsonPropertyName("details")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<string, string[]>? Details { get; init; }

    public static ApiError Validation(string message, IReadOnlyDictionary<string, string[]>? fieldErrors = null)
        => new() { Code = "VALIDATION_FAILED", Message = message, Details = fieldErrors };

    public static ApiError NotFound(string message = "The requested resource was not found.")
        => new() { Code = "NOT_FOUND", Message = message };

    public static ApiError Unauthorized(string message = "You are not authenticated.")
        => new() { Code = "UNAUTHORIZED", Message = message };

    public static ApiError Forbidden(string message = "You do not have permission to perform this action.")
        => new() { Code = "FORBIDDEN", Message = message };

    public static ApiError Conflict(string message)
        => new() { Code = "CONFLICT", Message = message };

    public static ApiError Domain(string code, string message)
        => new() { Code = code, Message = message };

    public static ApiError Internal(string message = "An unexpected error occurred. Please try again later.")
        => new() { Code = "INTERNAL_ERROR", Message = message };

    public static ApiError Cancelled(string message = "The request was cancelled.")
        => new() { Code = "CANCELLED", Message = message };
}


