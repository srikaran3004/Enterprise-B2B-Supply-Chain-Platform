using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence.Repositories;

public sealed class PaymentRecordRepository : IPaymentRecordRepository
{
    private readonly PaymentDbContext _context;

    public PaymentRecordRepository(PaymentDbContext context)
    {
        _context = context;
    }

    public Task<PaymentRecord?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default)
        => _context.PaymentRecords.FirstOrDefaultAsync(p => p.OrderId == orderId, ct);

    public Task AddAsync(PaymentRecord paymentRecord, CancellationToken ct = default)
        => _context.PaymentRecords.AddAsync(paymentRecord, ct).AsTask();

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _context.SaveChangesAsync(ct);
}
