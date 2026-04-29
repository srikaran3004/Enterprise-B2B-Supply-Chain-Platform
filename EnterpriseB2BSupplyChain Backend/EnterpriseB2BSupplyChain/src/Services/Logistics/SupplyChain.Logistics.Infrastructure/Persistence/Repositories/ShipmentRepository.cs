using Microsoft.EntityFrameworkCore;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Repositories;

public class ShipmentRepository : IShipmentRepository
{
    private readonly LogisticsDbContext _context;

    public ShipmentRepository(LogisticsDbContext context) => _context = context;

    public async Task<Shipment?> GetByIdAsync(Guid shipmentId, CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Include(s => s.TrackingEvents)
            .FirstOrDefaultAsync(s => s.ShipmentId == shipmentId, ct);

    public async Task<Shipment?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Include(s => s.TrackingEvents)
            .FirstOrDefaultAsync(s => s.OrderId == orderId, ct);

    public async Task<List<Shipment>> GetByStatusAsync(ShipmentStatus status, CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Where(s => s.Status == status)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<Shipment>> GetAllActiveAsync(CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Where(s => s.Status != ShipmentStatus.Delivered
                     && s.Status != ShipmentStatus.Failed)
            .OrderBy(s => s.SlaDeadlineUtc)
            .ToListAsync(ct);

    public async Task<List<Shipment>> GetAllAsync(CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<Shipment>> GetByAgentIdAsync(Guid agentId, CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Include(s => s.TrackingEvents)
            .Where(s => s.AgentId == agentId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<Shipment>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.Shipments
            .Include(s => s.Agent)
            .Include(s => s.Vehicle)
            .Where(s => s.DealerId == dealerId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<Shipment>> GetActiveShipmentsForSlaCheckAsync(CancellationToken ct = default)
        => await _context.Shipments
            .Where(s => s.Status != ShipmentStatus.Delivered
                     && s.Status != ShipmentStatus.Failed
                     && !s.SlaAtRiskNotified)
            .ToListAsync(ct);

    public async Task<Guid?> AtomicAssignAsync(
        Guid orderId, Guid agentId, Guid vehicleId, DateTime slaDeadlineUtc, CancellationToken ct = default)
    {
        // Atomic + idempotent assignment flow:
        // 1) ensure shipment exists (race-safe upsert),
        // 2) claim agent and vehicle using conditional ExecuteUpdateAsync,
        // 3) advance shipment status, and
        // 4) insert AgentAssigned tracking event once.
        //
        // IMPORTANT: SQL retry strategy is enabled (EnableRetryOnFailure),
        // so user-initiated transactions must run inside CreateExecutionStrategy().
        var strategy = _context.Database.CreateExecutionStrategy();
        
        async Task<Guid?> ExecuteAtomicAssignmentAsync()
        {
            await using var tx = await _context.Database.BeginTransactionAsync(ct);
            try
            {
                var shipment = await _context.Shipments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.OrderId == orderId, ct);

                if (shipment is null)
                {
                    shipment = await CreateOrGetPendingShipmentAsync(orderId, slaDeadlineUtc, ct);
                }

                if (shipment is null)
                {
                    await tx.RollbackAsync(ct);
                    return null;
                }

                var shipmentId = shipment.ShipmentId;

                // Idempotent replay support: if this exact assignment already succeeded,
                // return success instead of failing with a false conflict.
                if (shipment.Status == ShipmentStatus.AgentAssigned
                    && shipment.AgentId == agentId
                    && shipment.VehicleId == vehicleId)
                {
                    await EnsureAgentAssignedTrackingEventAsync(shipmentId, ct);
                    await tx.CommitAsync(ct);
                    return shipmentId;
                }

                if (shipment.Status != ShipmentStatus.Pending)
                {
                    await tx.RollbackAsync(ct);
                    return null;
                }

                var agentRowsAffected = await _context.DeliveryAgents
                    .Where(a => a.AgentId == agentId && a.Status == AgentStatus.Available)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(a => a.Status, AgentStatus.Assigned)
                        .SetProperty(a => a.CurrentOrderId, (Guid?)orderId), ct);

                if (agentRowsAffected == 0)
                {
                    var agentAlreadyAssigned = await _context.DeliveryAgents
                        .AsNoTracking()
                        .AnyAsync(a => a.AgentId == agentId
                                    && a.Status == AgentStatus.Assigned
                                    && a.CurrentOrderId == orderId, ct);

                    if (!agentAlreadyAssigned)
                    {
                        await tx.RollbackAsync(ct);
                        return null;
                    }
                }

                var vehicleRowsAffected = await _context.Vehicles
                    .Where(v => v.VehicleId == vehicleId && v.Status == VehicleStatus.Available)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(v => v.Status, VehicleStatus.InUse)
                        .SetProperty(v => v.AssignedAgentId, (Guid?)agentId), ct);

                if (vehicleRowsAffected == 0)
                {
                    var vehicleAlreadyAssigned = await _context.Vehicles
                        .AsNoTracking()
                        .AnyAsync(v => v.VehicleId == vehicleId
                                    && v.Status == VehicleStatus.InUse
                                    && v.AssignedAgentId == agentId, ct);

                    if (!vehicleAlreadyAssigned)
                    {
                        await tx.RollbackAsync(ct);
                        return null;
                    }
                }

                var shipmentRowsAffected = await _context.Shipments
                    .Where(s => s.ShipmentId == shipmentId && s.Status == ShipmentStatus.Pending)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(s => s.Status, ShipmentStatus.AgentAssigned)
                        .SetProperty(s => s.AgentId, (Guid?)agentId)
                        .SetProperty(s => s.VehicleId, (Guid?)vehicleId)
                        .SetProperty(s => s.SlaDeadlineUtc, slaDeadlineUtc), ct);

                if (shipmentRowsAffected == 0)
                {
                    var shipmentAlreadyAssigned = await _context.Shipments
                        .AsNoTracking()
                        .AnyAsync(s => s.ShipmentId == shipmentId
                                    && s.Status == ShipmentStatus.AgentAssigned
                                    && s.AgentId == agentId
                                    && s.VehicleId == vehicleId, ct);

                    if (!shipmentAlreadyAssigned)
                    {
                        await tx.RollbackAsync(ct);
                        return null;
                    }
                }

                await EnsureAgentAssignedTrackingEventAsync(shipmentId, ct);

                await tx.CommitAsync(ct);
                return shipmentId;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }

        return await strategy.ExecuteAsync(ExecuteAtomicAssignmentAsync);
    }

    public async Task<bool> AtomicMarkPickedUpAsync(
        Guid shipmentId,
        Guid agentId,
        decimal? latitude,
        decimal? longitude,
        CancellationToken ct = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        async Task<bool> ExecuteAtomicPickupAsync()
        {
            await using var tx = await _context.Database.BeginTransactionAsync(ct);
            try
            {
                var pickedUpAt = DateTime.UtcNow;

                var rowsAffected = await _context.Shipments
                    .Where(s => s.ShipmentId == shipmentId
                             && s.AgentId == agentId
                             && s.Status == ShipmentStatus.AgentAssigned)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(s => s.Status, ShipmentStatus.PickedUp)
                        .SetProperty(s => s.PickedUpAt, pickedUpAt), ct);

                if (rowsAffected == 0)
                {
                    var alreadyPickedUp = await _context.Shipments
                        .AsNoTracking()
                        .AnyAsync(s => s.ShipmentId == shipmentId
                                    && s.AgentId == agentId
                                    && s.Status == ShipmentStatus.PickedUp, ct);

                    if (!alreadyPickedUp)
                    {
                        await tx.RollbackAsync(ct);
                        return false;
                    }
                }

                await EnsureSingleTrackingEventAsync(
                    shipmentId,
                    status: "PickedUp",
                    notes: "Goods picked up from warehouse",
                    place: null,
                    latitude,
                    longitude,
                    recordedByAgentId: agentId,
                    ct);

                await tx.CommitAsync(ct);
                return true;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }

        return await strategy.ExecuteAsync(ExecuteAtomicPickupAsync);
    }

    public async Task<bool> AtomicUpdateStatusAsync(
        Guid shipmentId,
        Guid agentId,
        ShipmentStatus newStatus,
        decimal? latitude,
        decimal? longitude,
        string? notes,
        string? place,
        CancellationToken ct = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        async Task<bool> ExecuteAtomicStatusUpdateAsync()
        {
            await using var tx = await _context.Database.BeginTransactionAsync(ct);
            try
            {
                var snapshot = await _context.Shipments
                    .AsNoTracking()
                    .Where(s => s.ShipmentId == shipmentId && s.AgentId == agentId)
                    .Select(s => new { s.VehicleId })
                    .FirstOrDefaultAsync(ct);

                if (snapshot is null)
                {
                    await tx.RollbackAsync(ct);
                    return false;
                }

                var now = DateTime.UtcNow;
                var baseQuery = _context.Shipments
                    .Where(s => s.ShipmentId == shipmentId && s.AgentId == agentId);

                var rowsAffected = newStatus switch
                {
                    ShipmentStatus.InTransit => await baseQuery
                        .Where(s => s.Status == ShipmentStatus.AgentAssigned
                                 || s.Status == ShipmentStatus.PickedUp
                                 || s.Status == ShipmentStatus.InTransit
                                 || s.Status == ShipmentStatus.OutForDelivery
                                 || s.Status == ShipmentStatus.VehicleBreakdown)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.Status, ShipmentStatus.InTransit), ct),

                    ShipmentStatus.OutForDelivery => await baseQuery
                        .Where(s => s.Status == ShipmentStatus.AgentAssigned
                                 || s.Status == ShipmentStatus.PickedUp
                                 || s.Status == ShipmentStatus.InTransit
                                 || s.Status == ShipmentStatus.OutForDelivery
                                 || s.Status == ShipmentStatus.VehicleBreakdown)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.Status, ShipmentStatus.OutForDelivery), ct),

                    ShipmentStatus.VehicleBreakdown => await baseQuery
                        .Where(s => s.Status == ShipmentStatus.AgentAssigned
                                 || s.Status == ShipmentStatus.PickedUp
                                 || s.Status == ShipmentStatus.InTransit
                                 || s.Status == ShipmentStatus.OutForDelivery
                                 || s.Status == ShipmentStatus.VehicleBreakdown)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.Status, ShipmentStatus.VehicleBreakdown), ct),

                    ShipmentStatus.Delivered => await baseQuery
                        .Where(s => s.Status == ShipmentStatus.PickedUp
                                 || s.Status == ShipmentStatus.InTransit
                                 || s.Status == ShipmentStatus.OutForDelivery
                                 || s.Status == ShipmentStatus.VehicleBreakdown)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.Status, ShipmentStatus.Delivered)
                            .SetProperty(s => s.DeliveredAt, s => s.DeliveredAt ?? now), ct),

                    _ => 0
                };

                var shouldAppendTracking = true;
                if (rowsAffected == 0)
                {
                    var alreadyInState = await _context.Shipments
                        .AsNoTracking()
                        .AnyAsync(s => s.ShipmentId == shipmentId
                                    && s.AgentId == agentId
                                    && s.Status == newStatus, ct);

                    if (!alreadyInState)
                    {
                        await tx.RollbackAsync(ct);
                        return false;
                    }

                    // Delivered is terminal; avoid duplicate delivered tracking events on retries.
                    if (newStatus == ShipmentStatus.Delivered)
                        shouldAppendTracking = false;
                }

                if (shouldAppendTracking)
                {
                    var effectiveNotes = !string.IsNullOrWhiteSpace(notes)
                        ? notes
                        : newStatus switch
                        {
                            ShipmentStatus.Delivered => "Order delivered successfully",
                            ShipmentStatus.VehicleBreakdown => "Vehicle breakdown reported by agent.",
                            _ => null
                        };

                    var trackingEvent = TrackingEvent.Create(
                        shipmentId,
                        newStatus.ToString(),
                        latitude,
                        longitude,
                        effectiveNotes,
                        agentId,
                        place);

                    _context.TrackingEvents.Add(trackingEvent);
                    await _context.SaveChangesAsync(ct);
                    _context.Entry(trackingEvent).State = EntityState.Detached;
                }

                if (newStatus == ShipmentStatus.Delivered)
                {
                    await _context.DeliveryAgents
                        .Where(a => a.AgentId == agentId)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(a => a.Status, AgentStatus.Available)
                            .SetProperty(a => a.CurrentOrderId, (Guid?)null), ct);

                    if (snapshot.VehicleId.HasValue)
                    {
                        await _context.Vehicles
                            .Where(v => v.VehicleId == snapshot.VehicleId.Value)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(v => v.Status, VehicleStatus.Available)
                                .SetProperty(v => v.AssignedAgentId, (Guid?)null), ct);
                    }
                }

                await tx.CommitAsync(ct);
                return true;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }

        return await strategy.ExecuteAsync(ExecuteAtomicStatusUpdateAsync);
    }

    private async Task<Shipment?> CreateOrGetPendingShipmentAsync(
        Guid orderId,
        DateTime slaDeadlineUtc,
        CancellationToken ct)
    {
        var newShipment = Shipment.Create(orderId, Guid.Empty, slaDeadlineUtc); // DealerId set via command in normal flow
        _context.Shipments.Add(newShipment);

        try
        {
            await _context.SaveChangesAsync(ct);
            _context.Entry(newShipment).State = EntityState.Detached;
            return await _context.Shipments
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.ShipmentId == newShipment.ShipmentId, ct);
        }
        catch (DbUpdateException ex) when (IsOrderIdUniqueConflict(ex))
        {
            _context.Entry(newShipment).State = EntityState.Detached;
            return await _context.Shipments
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrderId == orderId, ct);
        }
    }

    private async Task EnsureAgentAssignedTrackingEventAsync(Guid shipmentId, CancellationToken ct)
    {
        await EnsureSingleTrackingEventAsync(
            shipmentId,
            status: "AgentAssigned",
            notes: "Delivery agent assigned",
            place: null,
            latitude: null,
            longitude: null,
            recordedByAgentId: null,
            ct);
    }

    private async Task EnsureSingleTrackingEventAsync(
        Guid shipmentId,
        string status,
        string? notes,
        string? place,
        decimal? latitude,
        decimal? longitude,
        Guid? recordedByAgentId,
        CancellationToken ct)
    {
        var alreadyExists = await _context.TrackingEvents
            .AsNoTracking()
            .AnyAsync(t => t.ShipmentId == shipmentId && t.Status == status, ct);

        if (alreadyExists)
            return;

        var trackingEvent = TrackingEvent.Create(
            shipmentId,
            status,
            latitude,
            longitude,
            notes,
            recordedByAgentId,
            place);

        _context.TrackingEvents.Add(trackingEvent);
        await _context.SaveChangesAsync(ct);
        _context.Entry(trackingEvent).State = EntityState.Detached;
    }

    private static bool IsOrderIdUniqueConflict(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("IX_Shipments_OrderId", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)
            || message.Contains("UNIQUE KEY", StringComparison.OrdinalIgnoreCase);
    }

    public async Task AddAsync(Shipment shipment, CancellationToken ct = default)
        => await _context.Shipments.AddAsync(shipment, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        const int maxAttempts = 2;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await _context.SaveChangesAsync(ct);
                return;
            }
            catch (DbUpdateConcurrencyException ex) when (attempt < maxAttempts)
            {
                foreach (var entry in ex.Entries)
                {
                    var dbValues = await entry.GetDatabaseValuesAsync(ct);
                    if (dbValues is null)
                        throw;

                    // Keep current in-memory changes, refresh only the original values
                    // so EF can retry the update against latest DB state.
                    entry.OriginalValues.SetValues(dbValues);
                }
            }
        }
    }
}
