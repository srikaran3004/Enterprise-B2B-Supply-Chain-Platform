using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Repositories;

public class InvoiceRepository : IInvoiceRepository
{
    private readonly PaymentDbContext _context;

    public InvoiceRepository(PaymentDbContext context) => _context = context;

    public async Task<Invoice?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default)
        => await _context.Invoices.Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.OrderId == orderId, ct);

    public async Task<Invoice?> GetByIdAsync(Guid invoiceId, CancellationToken ct = default)
        => await _context.Invoices.Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId, ct);

    public async Task<Invoice?> GetByIdempotencyKeyAsync(string key, CancellationToken ct = default)
        => await _context.Invoices.Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.IdempotencyKey == key, ct);

    public async Task<List<Invoice>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.Invoices
            .Where(i => i.DealerId == dealerId)
            .OrderByDescending(i => i.GeneratedAt)
            .ToListAsync(ct);

    public async Task<List<Invoice>> GetAllAsync(CancellationToken ct = default)
        => await _context.Invoices
            .OrderByDescending(i => i.GeneratedAt)
            .ToListAsync(ct);

    public async Task<int> CountAsync(CancellationToken ct = default)
        => await _context.Invoices.CountAsync(ct);

    public async Task AddAsync(Invoice invoice, CancellationToken ct = default)
        => await _context.Invoices.AddAsync(invoice, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
