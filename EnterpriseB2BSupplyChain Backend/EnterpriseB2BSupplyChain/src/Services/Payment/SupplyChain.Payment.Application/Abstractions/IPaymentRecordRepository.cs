using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface IPaymentRecordRepository
{
    Task<PaymentRecord?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default);
    Task AddAsync(PaymentRecord paymentRecord, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
