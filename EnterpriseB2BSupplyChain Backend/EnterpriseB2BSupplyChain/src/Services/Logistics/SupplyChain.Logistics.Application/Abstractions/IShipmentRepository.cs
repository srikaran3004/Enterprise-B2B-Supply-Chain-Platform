using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Application.Abstractions;

public interface IShipmentRepository
{
    Task<Shipment?> GetByIdAsync(Guid shipmentId, CancellationToken ct = default);
    Task<Shipment?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default);
    Task<List<Shipment>> GetByStatusAsync(ShipmentStatus status, CancellationToken ct = default);
    Task<List<Shipment>> GetAllActiveAsync(CancellationToken ct = default);
    Task<List<Shipment>> GetAllAsync(CancellationToken ct = default);
    Task<List<Shipment>> GetByAgentIdAsync(Guid agentId, CancellationToken ct = default);
    Task<List<Shipment>> GetActiveShipmentsForSlaCheckAsync(CancellationToken ct = default);
    /// <summary>
    /// Atomic agent + vehicle + shipment assignment using ExecuteUpdateAsync.
    /// Bypasses the EF change tracker entirely to avoid concurrency exceptions.
    /// Returns the resulting shipment ID, or null if any precondition failed.
    /// </summary>
    Task<Guid?> AtomicAssignAsync(Guid orderId, Guid agentId, Guid vehicleId, DateTime slaDeadlineUtc, CancellationToken ct = default);
    Task<bool> AtomicMarkPickedUpAsync(Guid shipmentId, Guid agentId, decimal? latitude, decimal? longitude, CancellationToken ct = default);
    Task<bool> AtomicUpdateStatusAsync(
        Guid shipmentId,
        Guid agentId,
        ShipmentStatus newStatus,
        decimal? latitude,
        decimal? longitude,
        string? notes,
        string? place,
        CancellationToken ct = default);
    Task AddAsync(Shipment shipment, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
