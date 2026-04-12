using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Repositories;

public class PurchaseLimitHistoryRepository : IPurchaseLimitHistoryRepository
{
    private readonly PaymentDbContext _context;

    public PurchaseLimitHistoryRepository(PaymentDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(PurchaseLimitHistory history, CancellationToken ct = default)
        => await _context.PurchaseLimitHistory.AddAsync(history, ct);

    public async Task<List<PurchaseLimitHistory>> GetByDealerIdAsync(Guid dealerId, DateTime? fromUtc, DateTime? toUtc, CancellationToken ct = default)
    {
        var query = _context.PurchaseLimitHistory
            .AsNoTracking()
            .Where(x => x.DealerId == dealerId);

        if (fromUtc.HasValue)
            query = query.Where(x => x.ChangedAt >= fromUtc.Value);

        if (toUtc.HasValue)
            query = query.Where(x => x.ChangedAt <= toUtc.Value);

        return await query
            .OrderByDescending(x => x.ChangedAt)
            .ToListAsync(ct);
    }
}
