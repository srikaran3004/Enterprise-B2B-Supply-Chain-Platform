using Microsoft.EntityFrameworkCore;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Infrastructure.Persistence;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Repositories;

public class OutboxRepository : IOutboxRepository
{
    private readonly LogisticsDbContext _context;

    public OutboxRepository(LogisticsDbContext context) => _context = context;

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
