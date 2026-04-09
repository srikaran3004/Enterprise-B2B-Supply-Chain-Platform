using Microsoft.EntityFrameworkCore;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Repositories;

public class AgentRepository : IAgentRepository
{
    private readonly LogisticsDbContext _context;

    public AgentRepository(LogisticsDbContext context) => _context = context;

    public async Task<DeliveryAgent?> GetByIdAsync(Guid agentId, CancellationToken ct = default)
        => await _context.DeliveryAgents.FirstOrDefaultAsync(a => a.AgentId == agentId, ct);

    public async Task<List<DeliveryAgent>> GetAllAsync(CancellationToken ct = default)
        => await _context.DeliveryAgents.OrderBy(a => a.ServiceRegion).ThenBy(a => a.FullName).ToListAsync(ct);

    public async Task<List<DeliveryAgent>> GetByStatusAsync(AgentStatus status, CancellationToken ct = default)
        => await _context.DeliveryAgents
            .Where(a => a.Status == status)
            .ToListAsync(ct);

    public async Task<List<DeliveryAgent>> GetByStatusAndRegionAsync(AgentStatus status, string region, CancellationToken ct = default)
    {
        // Fetch all available agents first, then apply case-insensitive partial region match in memory.
        // This avoids EF translation issues with StringComparison and handles cases where
        // the order's shippingState ("Maharashtra") partially matches agent's serviceRegion ("Maharashtra")
        // regardless of casing differences.
        var normalised = region.Trim().ToLowerInvariant();
        var all = await _context.DeliveryAgents
            .Where(a => a.Status == status)
            .ToListAsync(ct);

        return all
            .Where(a => !string.IsNullOrWhiteSpace(a.ServiceRegion) &&
                        (a.ServiceRegion.ToLowerInvariant().Contains(normalised) ||
                         normalised.Contains(a.ServiceRegion.ToLowerInvariant())))
            .ToList();
    }

    public async Task<Vehicle?> GetAvailableVehicleAsync(CancellationToken ct = default)
        => await _context.Vehicles
            .FirstOrDefaultAsync(v => v.Status == VehicleStatus.Available, ct);

    public async Task<Vehicle?> GetVehicleByIdAsync(Guid vehicleId, CancellationToken ct = default)
        => await _context.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId, ct);

    public async Task<List<Vehicle>> GetAllVehiclesAsync(CancellationToken ct = default)
        => await _context.Vehicles.OrderBy(v => v.RegistrationNo).ToListAsync(ct);

    public async Task<bool> TryAssignAgentAsync(Guid agentId, Guid orderId, CancellationToken ct = default)
    {
        // Check local cache first — prevents duplicate tracked instance issues.
        var agent = _context.DeliveryAgents.Local.FirstOrDefault(a => a.AgentId == agentId && a.Status == AgentStatus.Available)
                 ?? await _context.DeliveryAgents.FirstOrDefaultAsync(a => a.AgentId == agentId && a.Status == AgentStatus.Available, ct);

        if (agent is null)
            return false;

        agent.AssignToOrder(orderId);
        return true;
    }

    public async Task<bool> TryAssignVehicleAsync(Guid vehicleId, Guid agentId, CancellationToken ct = default)
    {
        // Check local cache first — prevents duplicate tracked instance issues.
        var vehicle = _context.Vehicles.Local.FirstOrDefault(v => v.VehicleId == vehicleId && v.Status == VehicleStatus.Available)
                   ?? await _context.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId && v.Status == VehicleStatus.Available, ct);

        if (vehicle is null)
            return false;

        vehicle.AssignToAgent(agentId);
        return true;
    }

    public async Task AddAgentAsync(DeliveryAgent agent, CancellationToken ct = default)
        => await _context.DeliveryAgents.AddAsync(agent, ct);

    public async Task AddVehicleAsync(Vehicle vehicle, CancellationToken ct = default)
        => await _context.Vehicles.AddAsync(vehicle, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
