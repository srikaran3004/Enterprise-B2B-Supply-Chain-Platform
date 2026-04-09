using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class RedisCacheService : ICacheService
{
    private readonly IDatabase _db;
    private readonly IConnectionMultiplexer _redis;

    public RedisCacheService(IConnectionMultiplexer redis)
    {
        _redis = redis;
        _db = redis.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var value = await _db.StringGetAsync(key);
            if (!value.HasValue) return default;
            return JsonSerializer.Deserialize<T>((string)value!);
        }
        catch
        {
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            await _db.StringSetAsync(key, json, ttl ?? TimeSpan.FromMinutes(5));
        }
        catch
        {
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await _db.KeyDeleteAsync(key);
        }
        catch
        {
        }
    }

    public async Task RemoveByPatternAsync(string pattern, CancellationToken ct = default)
    {
        try
        {
            var server = GetServer();
            if (server is null) return;

            var keys = server.Keys(pattern: pattern).ToArray();
            if (keys.Length > 0)
                await _db.KeyDeleteAsync(keys);
        }
        catch
        {
        }
    }

    public async Task SoftLockStockAsync(Guid productId, Guid orderId, int quantity, CancellationToken ct = default)
    {
        try
        {
            var key = $"inventory:softlock:{productId}:{orderId}";
            await _db.StringSetAsync(key, quantity, TimeSpan.FromMinutes(30));
        }
        catch
        {
        }
    }

    public async Task ReleaseSoftLockAsync(Guid productId, Guid orderId, CancellationToken ct = default)
    {
        try
        {
            var key = $"inventory:softlock:{productId}:{orderId}";
            await _db.KeyDeleteAsync(key);
        }
        catch
        {
        }
    }

    public async Task<int> GetSoftLockedQuantityAsync(Guid productId, CancellationToken ct = default)
    {
        try
        {
            var server = GetServer();
            if (server is null) return 0;

            var pattern = $"inventory:softlock:{productId}:*";
            var keys = server.Keys(pattern: pattern).ToArray();
            var total = 0;
            foreach (var key in keys)
            {
                var val = await _db.StringGetAsync(key);
                if (val.HasValue && int.TryParse((string)val!, out var qty))
                    total += qty;
            }

            return total;
        }
        catch
        {
            return 0;
        }
    }

    private IServer? GetServer()
    {
        var endpoints = _redis.GetEndPoints();
        if (endpoints.Length == 0) return null;
        return _redis.GetServer(endpoints[0]);
    }
}
