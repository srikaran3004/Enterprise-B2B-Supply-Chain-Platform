using System.Text.Json.Serialization;

namespace SupplyChain.BuildingBlocks.Results;

/// <summary>
/// Pagination envelope used by list endpoints (products, orders, dealers, etc.).
/// Returned inside <see cref="ApiResponse{T}.Data"/> for paginated queries.
/// </summary>
public sealed class PaginatedResult<T>
{
    [JsonPropertyName("items")]
    public required IReadOnlyList<T> Items { get; init; }

    [JsonPropertyName("pageNumber")]
    public required int PageNumber { get; init; }

    [JsonPropertyName("pageSize")]
    public required int PageSize { get; init; }

    [JsonPropertyName("totalCount")]
    public required int TotalCount { get; init; }

    [JsonPropertyName("totalPages")]
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);

    [JsonPropertyName("hasPrevious")]
    public bool HasPrevious => PageNumber > 1;

    [JsonPropertyName("hasNext")]
    public bool HasNext => PageNumber < TotalPages;

    public static PaginatedResult<T> Create(IReadOnlyList<T> items, int pageNumber, int pageSize, int totalCount)
        => new()
        {
            Items       = items,
            PageNumber  = pageNumber,
            PageSize    = pageSize,
            TotalCount  = totalCount,
        };
}
