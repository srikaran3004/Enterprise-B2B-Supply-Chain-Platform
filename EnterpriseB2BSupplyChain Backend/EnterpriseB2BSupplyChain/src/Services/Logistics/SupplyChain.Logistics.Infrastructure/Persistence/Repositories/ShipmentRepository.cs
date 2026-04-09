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

    public async Task<List<Shipment>> GetActiveShipmentsForSlaCheckAsync(CancellationToken ct = default)
        => await _context.Shipments
            .Where(s => s.Status != ShipmentStatus.Delivered
                     && s.Status != ShipmentStatus.Failed
                     && !s.SlaAtRiskNotified)
            .ToListAsync(ct);

    public async Task<Guid?> AtomicAssignAsync(
        Guid orderId, Guid agentId, Guid vehicleId, DateTime slaDeadlineUtc, CancellationToken ct = default)
    {
        // Use a database transaction so that all four mutations succeed or fail together.
        // This pattern uses ExecuteUpdateAsync (raw SQL UPDATE) to bypass the EF change
        // tracker entirely — the previous tracked-entity approach was prone to
        // DbUpdateConcurrencyException when the same row was loaded twice (eager-include
        // navigation collections + Local cache). With direct SQL UPDATEs, there is no
        // tracking state to manage.

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            // Step 1: Upsert the Shipment row. If a Pending shipment already exists
            // for this OrderId, reuse it. Otherwise insert a new one.
            var shipment = await _context.Shipments
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrderId == orderId, ct);

            Guid shipmentId;
            if (shipment is null)
            {
                var newShipment = Shipment.Create(orderId, slaDeadlineUtc);
                _context.Shipments.Add(newShipment);
                await _context.SaveChangesAsync(ct);
                _context.Entry(newShipment).State = EntityState.Detached;
                shipmentId = newShipment.ShipmentId;
            }
            else
            {
                if (shipment.Status != ShipmentStatus.Pending)
                {
                    await tx.RollbackAsync(ct);
                    return null;
                }
                shipmentId = shipment.ShipmentId;
            }

            // Step 2: Atomically claim the Agent if Available.
            var agentRowsAffected = await _context.DeliveryAgents
                .Where(a => a.AgentId == agentId && a.Status == AgentStatus.Available)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, AgentStatus.Assigned)
                    .SetProperty(a => a.CurrentOrderId, (Guid?)orderId), ct);

            if (agentRowsAffected == 0)
            {
                await tx.RollbackAsync(ct);
                return null;
            }

            // Step 3: Atomically claim the Vehicle if Available.
            var vehicleRowsAffected = await _context.Vehicles
                .Where(v => v.VehicleId == vehicleId && v.Status == VehicleStatus.Available)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(v => v.Status, VehicleStatus.InUse)
                    .SetProperty(v => v.AssignedAgentId, (Guid?)agentId), ct);

            if (vehicleRowsAffected == 0)
            {
                // Roll back the agent claim and bail out.
                await tx.RollbackAsync(ct);
                return null;
            }

            // Step 4: Atomically advance the Shipment from Pending to AgentAssigned.
            var shipmentRowsAffected = await _context.Shipments
                .Where(s => s.ShipmentId == shipmentId && s.Status == ShipmentStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.Status, ShipmentStatus.AgentAssigned)
                    .SetProperty(s => s.AgentId, (Guid?)agentId)
                    .SetProperty(s => s.VehicleId, (Guid?)vehicleId), ct);

            if (shipmentRowsAffected == 0)
            {
                await tx.RollbackAsync(ct);
                return null;
            }

            // Step 5: Insert the AgentAssigned tracking event.
            var trackingEvent = TrackingEvent.Create(
                shipmentId, "AgentAssigned",
                notes: "Delivery agent assigned");
            _context.TrackingEvents.Add(trackingEvent);
            await _context.SaveChangesAsync(ct);
            _context.Entry(trackingEvent).State = EntityState.Detached;

            await tx.CommitAsync(ct);
            return shipmentId;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task AddAsync(Shipment shipment, CancellationToken ct = default)
        => await _context.Shipments.AddAsync(shipment, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
