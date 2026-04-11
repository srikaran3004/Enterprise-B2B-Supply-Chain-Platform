using System.Text.Json;
using StackExchange.Redis;
using SupplyChain.Catalog.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class InventoryReservationService : IInventoryReservationService
{
    private const string DealerIndexPrefix = "reservation:index:dealer:";
    private const string ProductIndexPrefix = "reservation:index:product:";
    private static readonly TimeSpan ReservationTTL = TimeSpan.FromMinutes(15);

    private readonly IDatabase _redis;
    private readonly IProductRepository _productRepo;
    private readonly ILogger<InventoryReservationService> _logger;

    public InventoryReservationService(
        IConnectionMultiplexer redis,
        IProductRepository productRepo,
        ILogger<InventoryReservationService> logger)
    {
        _redis = redis.GetDatabase();
        _productRepo = productRepo;
        _logger = logger;
    }

    public async Task<bool> ReserveInventoryAsync(Guid dealerId, Guid productId, int quantity, CancellationToken ct = default)
    {
        if (quantity <= 0)
            return false;

        var isAvailable = await IsInventoryAvailableAsync(productId, quantity, dealerId, ct);
        if (!isAvailable)
            return false;

        var reservationKey = GetReservationKey(dealerId, productId);
        var reservation = new ReservationData
        {
            DealerId = dealerId,
            ProductId = productId,
            Quantity = quantity,
            ReservedAt = DateTime.UtcNow
        };

        try
        {
            await _redis.StringSetAsync(reservationKey, JsonSerializer.Serialize(reservation), ReservationTTL);
            await _redis.SetAddAsync(GetDealerIndexKey(dealerId), reservationKey);
            await _redis.SetAddAsync(GetProductIndexKey(productId), reservationKey);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while reserving inventory for dealer {DealerId}, product {ProductId}. Falling back to non-reserved availability.",
                dealerId,
                productId);

            // Redis is used for soft reservations. If it is unavailable, avoid bubbling a 500
            // and allow the caller to continue based on stock validation already performed.
            return true;
        }

        return true;
    }

    public async Task ReleaseReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        try
        {
            var reservationKey = GetReservationKey(dealerId, productId);
            await _redis.KeyDeleteAsync(reservationKey);
            await _redis.SetRemoveAsync(GetDealerIndexKey(dealerId), reservationKey);
            await _redis.SetRemoveAsync(GetProductIndexKey(productId), reservationKey);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while releasing reservation for dealer {DealerId}, product {ProductId}.",
                dealerId,
                productId);
        }
    }

    public async Task ReleaseAllReservationsAsync(Guid dealerId, CancellationToken ct = default)
    {
        try
        {
            var dealerIndexKey = GetDealerIndexKey(dealerId);
            var members = await _redis.SetMembersAsync(dealerIndexKey);
            if (members.Length == 0)
                return;

            var reservationKeys = members
                .Select(m => m.ToString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => (RedisKey)s)
                .ToArray();

            if (reservationKeys.Length == 0)
            {
                await _redis.KeyDeleteAsync(dealerIndexKey);
                return;
            }

            await _redis.KeyDeleteAsync(reservationKeys);

            foreach (var key in reservationKeys)
            {
                if (TryParseReservationKey(key.ToString(), out var parsedDealerId, out var parsedProductId)
                    && parsedDealerId == dealerId)
                {
                    await _redis.SetRemoveAsync(GetProductIndexKey(parsedProductId), key.ToString());
                }
            }

            await _redis.KeyDeleteAsync(dealerIndexKey);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while releasing all reservations for dealer {DealerId}.",
                dealerId);
        }
    }

    public async Task<int> GetReservedQuantityAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        try
        {
            var reservationKey = GetReservationKey(dealerId, productId);
            var value = await _redis.StringGetAsync(reservationKey);

            if (value.IsNullOrEmpty)
                return 0;

            return TryDeserializeReservation(value, out var reservation)
                ? reservation.Quantity
                : 0;
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while reading reserved quantity for dealer {DealerId}, product {ProductId}.",
                dealerId,
                productId);
            return 0;
        }
    }

    public async Task<int> GetTotalReservedQuantityAsync(Guid productId, CancellationToken ct = default)
    {
        try
        {
            var indexKey = GetProductIndexKey(productId);
            var members = await _redis.SetMembersAsync(indexKey);
            if (members.Length == 0)
                return 0;

            var reservationKeys = members
                .Select(m => m.ToString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => (RedisKey)s)
                .ToArray();

            if (reservationKeys.Length == 0)
                return 0;

            var values = await _redis.StringGetAsync(reservationKeys);
            var stale = new List<RedisValue>();
            var totalReserved = 0;

            for (var i = 0; i < reservationKeys.Length; i++)
            {
                var value = values[i];
                if (value.IsNullOrEmpty)
                {
                    stale.Add(reservationKeys[i].ToString());
                    continue;
                }

                if (TryDeserializeReservation(value, out var reservation))
                {
                    totalReserved += reservation.Quantity;
                    continue;
                }

                stale.Add(reservationKeys[i].ToString());
            }

            if (stale.Count > 0)
                await _redis.SetRemoveAsync(indexKey, stale.ToArray());

            return totalReserved;
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while reading total reserved quantity for product {ProductId}. Assuming no active reservations.",
                productId);
            return 0;
        }
    }

    public async Task<bool> IsInventoryAvailableAsync(Guid productId, int requestedQuantity, Guid? excludeDealerId = null, CancellationToken ct = default)
    {
        var product = await _productRepo.GetByIdAsync(productId, ct);
        if (product == null)
            return false;

        try
        {
            var indexKey = GetProductIndexKey(productId);
            var members = await _redis.SetMembersAsync(indexKey);

            var reservationKeys = members
                .Select(m => m.ToString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => (RedisKey)s)
                .ToArray();

            var totalReserved = 0;
            if (reservationKeys.Length > 0)
            {
                var values = await _redis.StringGetAsync(reservationKeys);
                var stale = new List<RedisValue>();

                for (var i = 0; i < reservationKeys.Length; i++)
                {
                    var value = values[i];
                    if (value.IsNullOrEmpty)
                    {
                        stale.Add(reservationKeys[i].ToString());
                        continue;
                    }

                    if (!TryDeserializeReservation(value, out var reservation))
                    {
                        stale.Add(reservationKeys[i].ToString());
                        continue;
                    }

                    if (excludeDealerId.HasValue && reservation.DealerId == excludeDealerId.Value)
                        continue;

                    totalReserved += reservation.Quantity;
                }

                if (stale.Count > 0)
                    await _redis.SetRemoveAsync(indexKey, stale.ToArray());
            }

            var availableStock = product.AvailableStock - totalReserved;
            return availableStock >= requestedQuantity;
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while checking inventory for product {ProductId}. Falling back to DB stock only.",
                productId);
            return product.AvailableStock >= requestedQuantity;
        }
    }

    public async Task ExtendReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default)
    {
        try
        {
            var reservationKey = GetReservationKey(dealerId, productId);
            var exists = await _redis.KeyExistsAsync(reservationKey);

            if (!exists)
                return;

            await _redis.KeyExpireAsync(reservationKey, ReservationTTL);
            await _redis.SetAddAsync(GetDealerIndexKey(dealerId), reservationKey);
            await _redis.SetAddAsync(GetProductIndexKey(productId), reservationKey);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex,
                "Redis unavailable while extending reservation for dealer {DealerId}, product {ProductId}.",
                dealerId,
                productId);
        }
    }

    private static string GetReservationKey(Guid dealerId, Guid productId)
        => $"reservation:{dealerId}:{productId}";

    private static string GetDealerIndexKey(Guid dealerId)
        => $"{DealerIndexPrefix}{dealerId}";

    private static string GetProductIndexKey(Guid productId)
        => $"{ProductIndexPrefix}{productId}";

    private static bool TryDeserializeReservation(RedisValue value, out ReservationData reservation)
    {
        reservation = new ReservationData();

        try
        {
            var parsed = JsonSerializer.Deserialize<ReservationData>((string)value!);
            if (parsed is null)
                return false;

            reservation = parsed;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool TryParseReservationKey(string key, out Guid dealerId, out Guid productId)
    {
        dealerId = Guid.Empty;
        productId = Guid.Empty;

        var parts = key.Split(':', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 3)
            return false;

        return parts[0].Equals("reservation", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(parts[1], out dealerId)
            && Guid.TryParse(parts[2], out productId);
    }

    private class ReservationData
    {
        public Guid DealerId { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public DateTime ReservedAt { get; set; }
    }
}

