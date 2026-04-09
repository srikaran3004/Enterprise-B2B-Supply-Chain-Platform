using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface ICreditAccountRepository
{
    Task<DealerCreditAccount?> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default);
    Task AddAsync(DealerCreditAccount account, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
