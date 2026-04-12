using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface IPurchaseLimitHistoryRepository
{
    Task AddAsync(PurchaseLimitHistory history, CancellationToken ct = default);
    Task<List<PurchaseLimitHistory>> GetByDealerIdAsync(Guid dealerId, DateTime? fromUtc, DateTime? toUtc, CancellationToken ct = default);
}
