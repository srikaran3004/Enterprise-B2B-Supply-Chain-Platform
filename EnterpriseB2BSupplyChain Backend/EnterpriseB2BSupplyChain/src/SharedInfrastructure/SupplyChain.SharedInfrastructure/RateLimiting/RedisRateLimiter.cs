using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Threading.RateLimiting;

namespace SupplyChain.SharedInfrastructure.RateLimiting;

/// <summary>
/// A distributed rate limiter backed by Redis using a fixed-window sliding counter.
/// Uses an atomic Lua script to increment and set TTL in a single round-trip,
/// making it safe for concurrent requests across multiple service replicas.
/// </summary>
public sealed class RedisRateLimiter : RateLimiter
{
    private readonly string               _key;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger?             _logger;
    private readonly int                  _permitLimit;
    private readonly int                  _windowSeconds;

    // Lua script: atomically INCR the key and set TTL on first access.
    // Returns the new count after increment.
    private const string LuaScript = @"
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current";

    public RedisRateLimiter(
        string key,
        IConnectionMultiplexer redis,
        ILogger? logger,
        int permitLimit,
        int windowSeconds)
    {
        _key           = key;
        _redis         = redis;
        _logger        = logger;
        _permitLimit   = permitLimit;
        _windowSeconds = windowSeconds;
    }

    public override TimeSpan? IdleDuration => null;

    protected override RateLimitLease AttemptAcquireCore(int permitCount)
    {
        try
        {
            var db = _redis.GetDatabase();
            var result = (long)db.ScriptEvaluate(LuaScript,
                keys: [_key],
                values: [(RedisValue)_windowSeconds.ToString()])!;

            return result <= _permitLimit
                ? new GrantedLease()
                : new DeniedLease();
        }
        catch (Exception ex)
        {
            // Redis unavailable — fail open (allow request) to avoid service disruption.
            _logger?.LogWarning(ex,
                "Redis rate limiter encountered an error for key {Key}. Failing open.", _key);
            return new GrantedLease();
        }
    }

    protected override ValueTask<RateLimitLease> AcquireAsyncCore(
        int permitCount, CancellationToken cancellationToken)
        => new(AttemptAcquireCore(permitCount));

    protected override void Dispose(bool disposing) { }

    public override RateLimiterStatistics? GetStatistics() => null;

    // --- Lease Implementations ---

    private sealed class GrantedLease : RateLimitLease
    {
        public override bool IsAcquired => true;
        public override IEnumerable<string> MetadataNames => [];
        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            metadata = null;
            return false;
        }
        protected override void Dispose(bool disposing) { }
    }

    private sealed class DeniedLease : RateLimitLease
    {
        private static readonly MetadataName<TimeSpan> RetryAfterMeta = MetadataName.RetryAfter;

        public override bool IsAcquired => false;
        public override IEnumerable<string> MetadataNames => [RetryAfterMeta.Name];
        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (metadataName == RetryAfterMeta.Name)
            {
                metadata = TimeSpan.FromSeconds(60);
                return true;
            }
            metadata = null;
            return false;
        }
        protected override void Dispose(bool disposing) { }
    }
}
