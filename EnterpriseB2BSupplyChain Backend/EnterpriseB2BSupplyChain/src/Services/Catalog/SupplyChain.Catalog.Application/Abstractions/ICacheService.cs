namespace SupplyChain.Catalog.Application.Abstractions;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPatternAsync(string pattern, CancellationToken ct = default);
    Task SoftLockStockAsync(Guid productId, Guid orderId, int quantity, CancellationToken ct = default);
    Task ReleaseSoftLockAsync(Guid productId, Guid orderId, CancellationToken ct = default);
    Task<int> GetSoftLockedQuantityAsync(Guid productId, CancellationToken ct = default);
}
