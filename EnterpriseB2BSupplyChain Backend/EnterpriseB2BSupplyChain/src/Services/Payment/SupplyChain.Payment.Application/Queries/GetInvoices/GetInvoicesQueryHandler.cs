using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.GetInvoices;

public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, List<InvoiceSummaryDto>>
{
    private readonly IInvoiceRepository _invoiceRepository;

    public GetInvoicesQueryHandler(IInvoiceRepository invoiceRepository)
        => _invoiceRepository = invoiceRepository;

    public async Task<List<InvoiceSummaryDto>> Handle(GetInvoicesQuery query, CancellationToken ct)
    {
        var invoices = query.DealerId.HasValue
            ? await _invoiceRepository.GetByDealerIdAsync(query.DealerId.Value, ct)
            : await _invoiceRepository.GetAllAsync(ct);

        return invoices.Select(i => new InvoiceSummaryDto(
            i.InvoiceId, i.InvoiceNumber, i.OrderId,
            i.GrandTotal, i.GstType, i.PaymentMode,
            i.GeneratedAt, i.IsSentToDealer
        )).ToList();
    }
}
