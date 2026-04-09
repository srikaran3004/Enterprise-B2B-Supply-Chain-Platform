namespace SupplyChain.Catalog.Application.Abstractions;

/// <summary>
/// Service for managing temporary inventory reservations (cart items)
/// </summary>
public interface IInventoryReservationService
{
    /// <summary>
    /// Reserve inventory for a dealer's cart item
    /// </summary>
    Task<bool> ReserveInventoryAsync(Guid dealerId, Guid productId, int quantity, CancellationToken ct = default);

    /// <summary>
    /// Release a specific reservation
    /// </summary>
    Task ReleaseReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default);

    /// <summary>
    /// Release all reservations for a dealer (clear cart)
    /// </summary>
    Task ReleaseAllReservationsAsync(Guid dealerId, CancellationToken ct = default);

    /// <summary>
    /// Get reserved quantity for a product by a dealer
    /// </summary>
    Task<int> GetReservedQuantityAsync(Guid dealerId, Guid productId, CancellationToken ct = default);

    /// <summary>
    /// Get total reserved quantity for a product (all dealers)
    /// </summary>
    Task<int> GetTotalReservedQuantityAsync(Guid productId, CancellationToken ct = default);

    /// <summary>
    /// Check if sufficient inventory is available (considering reservations)
    /// </summary>
    Task<bool> IsInventoryAvailableAsync(Guid productId, int requestedQuantity, Guid? excludeDealerId = null, CancellationToken ct = default);

    /// <summary>
    /// Extend reservation TTL (when dealer is active)
    /// </summary>
    Task ExtendReservationAsync(Guid dealerId, Guid productId, CancellationToken ct = default);
}
