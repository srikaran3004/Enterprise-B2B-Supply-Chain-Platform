using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;
using SupplyChain.Payment.Infrastructure.Persistence;

namespace SupplyChain.Payment.Infrastructure.Persistence.Repositories;

public class OutboxRepository : IOutboxRepository
{
    private readonly PaymentDbContext _context;

    public OutboxRepository(PaymentDbContext context) => _context = context;

    public async Task AddAsync(OutboxMessage message, CancellationToken ct = default)
        => await _context.OutboxMessages.AddAsync(message, ct);

    public async Task<List<OutboxMessage>> GetPendingAsync(int batchSize = 50, CancellationToken ct = default)
        => await _context.OutboxMessages
            .Where(m => m.Status == "Pending")
            .OrderBy(m => m.CreatedAt)
            .Take(batchSize)
            .ToListAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
