using System.Text.Json;

namespace SupplyChain.SharedInfrastructure.Results;

/// <summary>
/// Reads API payloads that may be wrapped in ApiResponse{T} and returns the inner data.
/// Supports both wrapped and legacy raw JSON payloads.
/// </summary>
public static class ApiResponseReader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task<T?> ReadDataAsync<T>(HttpContent content, CancellationToken ct = default)
    {
        var raw = await content.ReadAsStringAsync(ct);
        if (string.IsNullOrWhiteSpace(raw))
            return default;

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var payload = root;

            // New shape: { success, data, error, ... }
            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("data", out var dataElement))
            {
                payload = dataElement;
            }

            if (payload.ValueKind == JsonValueKind.Null ||
                payload.ValueKind == JsonValueKind.Undefined)
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(payload.GetRawText(), JsonOptions);
        }
        catch
        {
            // Fall back to raw payload to support plain DTO responses.
            try
            {
                return JsonSerializer.Deserialize<T>(raw, JsonOptions);
            }
            catch
            {
                return default;
            }
        }
    }
}
