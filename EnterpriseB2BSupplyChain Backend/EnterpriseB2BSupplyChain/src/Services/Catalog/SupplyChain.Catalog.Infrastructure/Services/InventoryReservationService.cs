using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class InventoryReservationService : IInventoryReservationService
{
    private readonly IDatabase _redis;
    private readonly IProductRepository _productRepo;
    private static readonly TimeSpan ReservationTTL = TimeSpan.FromMinutes(15);

    public InventoryReservationService(IConnectionMultiplexer redis, IProductRepository productRepo)
    {
        _redis = redis.GetDatabase();
        _productRepo = productRepo;
    }

    public async Task<bool> ReserveInventoryAsync(Guid dealerId, Guid productId, int quantity, CancellationToken ct = default)
    {
        if (quantity <= 0)
            return false;

        // Check if inventory is available
        var isAvailable = await IsInventoryAvailableAsync(productId, quantity, dealerId, ct);
        if (!isAvailable)
            return false;

        // Create reservation key
        var reservationKey = GetReservationKey(dealerId, productId);
        
        // Store reservation with TTL
        var reservation = new
        {
            DealerId = dealerId,
            ProductId = productId,
            Quantity = quantity,
            ReservedAt = DateTime.UtcNow
        };

        await _redis.StringSetAsync(reservationKey, JsonSerializer.Serialize(reservation), ReservationTTL);
        
        return true;
    }

    public async Task ReleaseReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        var reservationKey = GetReservationKey(dealerId, productId);
        await _redis.KeyDeleteAsync(reservationKey);
    }

    public async Task ReleaseAllReservationsAsync(Guid dealerId, CancellationToken ct = default)
    {
        // Find all reservation keys for this dealer
        var pattern = $"reservation:{dealerId}:*";
        var server = GetServer();
        
        if (server == null)
            return;

        var keys = server.Keys(pattern: pattern).ToArray();
        if (keys.Length > 0)
        {
            await _redis.KeyDeleteAsync(keys);
        }
    }

    public async Task<int> GetReservedQuantityAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        var reservationKey = GetReservationKey(dealerId, productId);
        var value = await _redis.StringGetAsync(reservationKey);
        
        if (value.IsNullOrEmpty)
            return 0;

        try
        {
            var reservation = JsonSerializer.Deserialize<ReservationData>((string)value!);
            return reservation?.Quantity ?? 0;
        }
        catch
        {
            return 0;
        }
    }

    public async Task<int> GetTotalReservedQuantityAsync(Guid productId, CancellationToken ct = default)
    {
        var pattern = $"reservation:*:{productId}";
        var server = GetServer();
        
        if (server == null)
            return 0;

        var keys = server.Keys(pattern: pattern).ToArray();
        if (keys.Length == 0)
            return 0;

        int totalReserved = 0;
        foreach (var key in keys)
        {
            var value = await _redis.StringGetAsync(key);
            if (!value.IsNullOrEmpty)
            {
                try
                {
                    var reservation = JsonSerializer.Deserialize<ReservationData>((string)value!);
                    totalReserved += reservation?.Quantity ?? 0;
                }
                catch
                {
                    // Skip invalid reservations
                }
            }
        }

        return totalReserved;
    }

    public async Task<bool> IsInventoryAvailableAsync(Guid productId, int requestedQuantity, Guid? excludeDealerId = null, CancellationToken ct = default)
    {
        // Get product's actual stock
        var product = await _productRepo.GetByIdAsync(productId, ct);
        if (product == null)
            return false;

        // Get total reserved quantity (excluding this dealer if specified)
        int totalReserved = 0;
        var pattern = $"reservation:*:{productId}";
        var server = GetServer();
        
        if (server != null)
        {
            var keys = server.Keys(pattern: pattern).ToArray();
            foreach (var key in keys)
            {
                // Skip this dealer's reservation if excluding
                if (excludeDealerId.HasValue && key.ToString().Contains(excludeDealerId.Value.ToString()))
                    continue;

                var value = await _redis.StringGetAsync(key);
                if (!value.IsNullOrEmpty)
                {
                    try
                    {
                        var reservation = JsonSerializer.Deserialize<ReservationData>((string)value!);
                        totalReserved += reservation?.Quantity ?? 0;
                    }
                    catch
                    {
                        // Skip invalid reservations
                    }
                }
            }
        }

        // Calculate available stock
        int availableStock = product.AvailableStock - totalReserved;
        
        return availableStock >= requestedQuantity;
    }

    public async Task ExtendReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        var reservationKey = GetReservationKey(dealerId, productId);
        var exists = await _redis.KeyExistsAsync(reservationKey);
        
        if (exists)
        {
            await _redis.KeyExpireAsync(reservationKey, ReservationTTL);
        }
    }

    private static string GetReservationKey(Guid dealerId, Guid productId)
        => $"reservation:{dealerId}:{productId}";

    private IServer? GetServer()
    {
        try
        {
            var multiplexer = _redis.Multiplexer;
            var endpoints = multiplexer.GetEndPoints();
            return endpoints.Length > 0 ? multiplexer.GetServer(endpoints[0]) : null;
        }
        catch
        {
            return null;
        }
    }

    private class ReservationData
    {
        public Guid DealerId { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public DateTime ReservedAt { get; set; }
    }
}
