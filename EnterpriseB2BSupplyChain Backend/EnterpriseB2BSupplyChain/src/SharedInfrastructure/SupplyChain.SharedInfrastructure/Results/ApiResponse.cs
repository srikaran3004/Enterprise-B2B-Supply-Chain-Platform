using System.Text.Json.Serialization;

namespace SupplyChain.SharedInfrastructure.Results;

/// <summary>
/// Generic API response envelope for successful and failed responses.
/// </summary>
public sealed class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("data")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public T? Data { get; init; }

    [JsonPropertyName("error")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ApiError? Error { get; init; }

    [JsonPropertyName("correlationId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CorrelationId { get; init; }

    [JsonPropertyName("traceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TraceId { get; init; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    /// <summary>Create a successful response envelope.</summary>
    public static ApiResponse<T> Ok(T data, string? correlationId = null, string? traceId = null)
        => new()
        {
            Success = true,
            Data = data,
            CorrelationId = correlationId,
            TraceId = traceId
        };

    /// <summary>Create a failed response envelope.</summary>
    public static ApiResponse<T> Fail(ApiError error, string? correlationId = null, string? traceId = null)
        => new()
        {
            Success = false,
            Error = error,
            CorrelationId = correlationId,
            TraceId = traceId
        };
}

/// <summary>
/// Non-generic envelope for responses without payload.
/// </summary>
public sealed class ApiResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("error")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ApiError? Error { get; init; }

    [JsonPropertyName("correlationId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CorrelationId { get; init; }

    [JsonPropertyName("traceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TraceId { get; init; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    public static ApiResponse Ok(string? correlationId = null, string? traceId = null)
        => new() { Success = true, CorrelationId = correlationId, TraceId = traceId };

    public static ApiResponse Fail(ApiError error, string? correlationId = null, string? traceId = null)
        => new() { Success = false, Error = error, CorrelationId = correlationId, TraceId = traceId };
}


