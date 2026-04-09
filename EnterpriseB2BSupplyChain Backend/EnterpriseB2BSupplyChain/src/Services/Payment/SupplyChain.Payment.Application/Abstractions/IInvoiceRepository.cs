using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface IInvoiceRepository
{
    Task<Invoice?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default);
    Task<Invoice?> GetByIdAsync(Guid invoiceId, CancellationToken ct = default);
    Task<Invoice?> GetByIdempotencyKeyAsync(string key, CancellationToken ct = default);
    Task<List<Invoice>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default);
    Task<List<Invoice>> GetAllAsync(CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
    Task AddAsync(Invoice invoice, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
