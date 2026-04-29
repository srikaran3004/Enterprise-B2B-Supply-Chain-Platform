using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken ct = default);
    Task<List<OutboxMessage>> GetPendingAsync(int batchSize = 50, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
