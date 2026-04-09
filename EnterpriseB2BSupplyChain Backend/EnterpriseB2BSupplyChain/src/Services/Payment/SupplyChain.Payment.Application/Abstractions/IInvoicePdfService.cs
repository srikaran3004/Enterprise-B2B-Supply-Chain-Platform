using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Abstractions;

public interface IInvoicePdfService
{
    Task<string> GenerateAsync(Invoice invoice, CancellationToken ct = default);
}
