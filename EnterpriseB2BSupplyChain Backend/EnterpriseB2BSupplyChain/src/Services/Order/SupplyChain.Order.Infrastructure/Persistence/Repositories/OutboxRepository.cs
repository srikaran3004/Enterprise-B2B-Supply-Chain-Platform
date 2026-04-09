using Microsoft.EntityFrameworkCore;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Infrastructure.Persistence.Repositories;

public class OutboxRepository : IOutboxRepository
{
    private readonly OrderDbContext _context;

    public OutboxRepository(OrderDbContext context) => _context = context;

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
