using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Application.Abstractions;

public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken ct = default);
    Task<List<OutboxMessage>> GetPendingAsync(int batchSize = 50, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
