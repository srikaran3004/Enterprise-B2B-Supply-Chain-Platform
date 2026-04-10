using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Application.Abstractions;

public interface IAgentRepository
{
    Task<DeliveryAgent?> GetByIdAsync(Guid agentId, CancellationToken ct = default);
    Task<DeliveryAgent?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<DeliveryAgent?> GetByFullNameAsync(string fullName, CancellationToken ct = default);
    Task<bool> ExistsByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<List<DeliveryAgent>> GetAllAsync(CancellationToken ct = default);
    Task<List<DeliveryAgent>> GetByStatusAsync(AgentStatus status, CancellationToken ct = default);
    Task<List<DeliveryAgent>> GetByStatusAndRegionAsync(AgentStatus status, string region, CancellationToken ct = default);
    Task<Vehicle?> GetAvailableVehicleAsync(CancellationToken ct = default);
    Task<Vehicle?> GetVehicleByIdAsync(Guid vehicleId, CancellationToken ct = default);
    Task<List<Vehicle>> GetAllVehiclesAsync(CancellationToken ct = default);
    Task<bool> TryAssignAgentAsync(Guid agentId, Guid orderId, CancellationToken ct = default);
    Task<bool> TryAssignVehicleAsync(Guid vehicleId, Guid agentId, CancellationToken ct = default);
    Task AddAgentAsync(DeliveryAgent agent, CancellationToken ct = default);
    Task AddVehicleAsync(Vehicle vehicle, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
