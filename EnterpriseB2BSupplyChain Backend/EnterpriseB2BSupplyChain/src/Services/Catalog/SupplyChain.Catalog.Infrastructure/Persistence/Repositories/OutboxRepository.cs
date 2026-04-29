using Microsoft.EntityFrameworkCore;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;
using SupplyChain.Catalog.Infrastructure.Persistence;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Repositories;

public class OutboxRepository : IOutboxRepository
{
    private readonly CatalogDbContext _context;

    public OutboxRepository(CatalogDbContext context) => _context = context;

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
