using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class TrackingCacheService : ITrackingCacheService
{
    private readonly IDatabase _db;

    public TrackingCacheService(IConnectionMultiplexer redis)
        => _db = redis.GetDatabase();

    public async Task SetLatestLocationAsync(
        Guid     orderId,
        decimal? lat,
        decimal? lng,
        string   status,
        CancellationToken ct = default)
    {
        try
        {
            var key  = $"tracking:{orderId}:latest";
            var entry = new TrackingCacheEntry(lat, lng, status, DateTime.UtcNow);
            await _db.StringSetAsync(key, JsonSerializer.Serialize(entry));
        }
        catch
        {
        }
    }

    public async Task<TrackingCacheEntry?> GetLatestLocationAsync(
        Guid orderId,
        CancellationToken ct = default)
    {
        try
        {
            var key   = $"tracking:{orderId}:latest";
            var value = await _db.StringGetAsync(key);
            if (!value.HasValue) return null;
            return JsonSerializer.Deserialize<TrackingCacheEntry>(value.ToString());
        }
        catch
        {
            return null;
        }
    }
}
