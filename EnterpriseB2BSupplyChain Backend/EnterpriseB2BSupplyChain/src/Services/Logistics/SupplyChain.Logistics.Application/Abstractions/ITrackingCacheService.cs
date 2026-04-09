namespace SupplyChain.Logistics.Application.Abstractions;

public interface ITrackingCacheService
{
    Task SetLatestLocationAsync(Guid orderId, decimal? lat, decimal? lng, string status, CancellationToken ct = default);
    Task<TrackingCacheEntry?> GetLatestLocationAsync(Guid orderId, CancellationToken ct = default);
}

public record TrackingCacheEntry(
    decimal? Latitude,
    decimal? Longitude,
    string   Status,
    DateTime UpdatedAt
);
