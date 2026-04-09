using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Repositories;

public class CreditAccountRepository : ICreditAccountRepository
{
    private readonly PaymentDbContext _context;

    public CreditAccountRepository(PaymentDbContext context) => _context = context;

    public async Task<DealerCreditAccount?> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.CreditAccounts
            .FirstOrDefaultAsync(a => a.DealerId == dealerId, ct);

    public async Task AddAsync(DealerCreditAccount account, CancellationToken ct = default)
        => await _context.CreditAccounts.AddAsync(account, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
