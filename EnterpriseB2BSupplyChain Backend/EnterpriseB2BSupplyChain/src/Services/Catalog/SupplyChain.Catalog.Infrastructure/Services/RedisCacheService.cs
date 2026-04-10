using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class RedisCacheService : ICacheService
{
    private const string CacheIndexPrefix = "cache:index:";
    private const string SoftLockIndexPrefix = "inventory:softlock:index:";

    private readonly IDatabase _db;

    public RedisCacheService(IConnectionMultiplexer redis)
    {
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
            await TrackCacheKeyAsync(key);
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
            await UntrackCacheKeyAsync(key);
        }
        catch
        {
        }
    }

    public async Task RemoveByPatternAsync(string pattern, CancellationToken ct = default)
    {
        try
        {
            var namespacePrefix = TryGetNamespacePrefixFromPattern(pattern);
            if (string.IsNullOrWhiteSpace(namespacePrefix))
                return;

            var indexKey = GetCacheIndexKey(namespacePrefix);
            var members = await _db.SetMembersAsync(indexKey);
            if (members.Length == 0)
                return;

            var keys = members
                .Select(m => m.ToString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => (RedisKey)s)
                .ToArray();

            if (keys.Length == 0)
            {
                await _db.KeyDeleteAsync(indexKey);
                return;
            }

            await _db.KeyDeleteAsync(keys);
            await _db.KeyDeleteAsync(indexKey);
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
            await _db.SetAddAsync(GetSoftLockIndexKey(productId), key);
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
            await _db.SetRemoveAsync(GetSoftLockIndexKey(productId), key);
        }
        catch
        {
        }
    }

    public async Task<int> GetSoftLockedQuantityAsync(Guid productId, CancellationToken ct = default)
    {
        try
        {
            var indexKey = GetSoftLockIndexKey(productId);
            var members = await _db.SetMembersAsync(indexKey);
            if (members.Length == 0)
                return 0;

            var keys = members
                .Select(m => m.ToString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => (RedisKey)s)
                .ToArray();

            if (keys.Length == 0)
                return 0;

            var values = await _db.StringGetAsync(keys);
            var stale = new List<RedisValue>();
            var total = 0;

            for (var i = 0; i < keys.Length; i++)
            {
                var value = values[i];
                if (value.IsNullOrEmpty)
                {
                    stale.Add(keys[i].ToString());
                    continue;
                }

                if (int.TryParse(value.ToString(), out var qty))
                {
                    total += qty;
                    continue;
                }

                stale.Add(keys[i].ToString());
            }

            if (stale.Count > 0)
            {
                await _db.SetRemoveAsync(indexKey, stale.Select(s => (RedisValue)s).ToArray());
            }

            return total;
        }
        catch
        {
            return 0;
        }
    }

    private async Task TrackCacheKeyAsync(string key)
    {
        var indexKey = GetCacheIndexKeyForKey(key);
        if (indexKey is null)
            return;

        await _db.SetAddAsync(indexKey, key);
    }

    private async Task UntrackCacheKeyAsync(string key)
    {
        var indexKey = GetCacheIndexKeyForKey(key);
        if (indexKey is null)
            return;

        await _db.SetRemoveAsync(indexKey, key);
    }

    private static string? GetCacheIndexKeyForKey(string key)
    {
        var prefix = TryGetNamespacePrefixFromKey(key);
        return string.IsNullOrWhiteSpace(prefix) ? null : GetCacheIndexKey(prefix);
    }

    private static string? TryGetNamespacePrefixFromKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var firstSeparator = key.IndexOf(':');
        if (firstSeparator < 0)
            return key;

        var secondSeparator = key.IndexOf(':', firstSeparator + 1);
        if (secondSeparator < 0)
            return key;

        return key[..secondSeparator];
    }

    private static string? TryGetNamespacePrefixFromPattern(string pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
            return null;

        var normalized = pattern.Trim();
        if (normalized.EndsWith('*'))
            normalized = normalized[..^1];

        normalized = normalized.TrimEnd(':');
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string GetCacheIndexKey(string namespacePrefix)
        => $"{CacheIndexPrefix}{namespacePrefix}";

    private static string GetSoftLockIndexKey(Guid productId)
        => $"{SoftLockIndexPrefix}{productId}";
}

