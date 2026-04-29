using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Abstractions;

public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken ct = default);
    Task<List<OutboxMessage>> GetPendingAsync(int batchSize = 50, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
