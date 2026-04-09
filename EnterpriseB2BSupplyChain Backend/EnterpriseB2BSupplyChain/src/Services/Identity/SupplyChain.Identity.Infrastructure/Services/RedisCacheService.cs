using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Infrastructure.Services;

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
            return default; // Fallback smoothly if Redis is down
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            await _db.StringSetAsync(key, json, ttl ?? TimeSpan.FromMinutes(10));
        }
        catch
        {
            // Ignore Redis connectivity issues
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

    private IServer? GetServer()
    {
        var endpoints = _redis.GetEndPoints();
        if (endpoints.Length == 0) return null;
        return _redis.GetServer(endpoints[0]);
    }
}
