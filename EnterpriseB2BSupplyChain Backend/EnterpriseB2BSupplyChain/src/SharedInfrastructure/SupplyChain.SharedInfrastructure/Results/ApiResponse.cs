using System.Text.Json.Serialization;

namespace SupplyChain.SharedInfrastructure.Results;

/// <summary>
/// Standard envelope for every API response across the HUL Supply Chain Platform.
///
/// Shape (JSON):
/// <code>
/// {
///   "success":       true,
///   "data":          { ... actual payload ... },
///   "error":         null,
///   "correlationId": "b1c9...",
///   "traceId":       "00-...",
///   "timestamp":     "2026-04-08T16:35:22.123Z"
/// }
/// </code>
/// Clients can reliably check <c>success</c> first, then pull <c>data</c> on success
/// or <c>error</c> on failure. <c>correlationId</c> is echoed so the client can
/// attach it to support requests for end-to-end tracing.
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

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Factory helpers
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public static ApiResponse<T> Ok(T data, string? correlationId = null, string? traceId = null)
        => new()
        {
            Success       = true,
            Data          = data,
            CorrelationId = correlationId,
            TraceId       = traceId,
        };

    public static ApiResponse<T> Fail(ApiError error, string? correlationId = null, string? traceId = null)
        => new()
        {
            Success       = false,
            Error         = error,
            CorrelationId = correlationId,
            TraceId       = traceId,
        };
}

/// <summary>
/// Non-generic convenience type for endpoints that do not return a payload
/// (e.g. <c>204 No Content</c> style operations still wrapped in the envelope).
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

