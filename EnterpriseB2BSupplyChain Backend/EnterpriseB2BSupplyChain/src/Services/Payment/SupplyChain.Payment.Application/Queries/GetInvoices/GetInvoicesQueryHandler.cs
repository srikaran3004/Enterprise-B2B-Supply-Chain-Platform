using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.GetInvoices;

public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, List<InvoiceSummaryDto>>
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRecordRepository _paymentRecordRepository;

    public GetInvoicesQueryHandler(
        IInvoiceRepository invoiceRepository,
        IPaymentRecordRepository paymentRecordRepository)
    {
        _invoiceRepository = invoiceRepository;
        _paymentRecordRepository = paymentRecordRepository;
    }

    public async Task<List<InvoiceSummaryDto>> Handle(GetInvoicesQuery query, CancellationToken ct)
    {
        var invoices = query.DealerId.HasValue
            ? await _invoiceRepository.GetByDealerIdAsync(query.DealerId.Value, ct)
            : await _invoiceRepository.GetAllAsync(ct);

        var paymentRecords = await _paymentRecordRepository.GetByOrderIdsAsync(
            invoices.Select(i => i.OrderId),
            ct);

        var paidByOrderId = paymentRecords
            .Where(p => string.Equals(p.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            .GroupBy(p => p.OrderId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.PaidAt ?? x.CreatedAt).First());

        return invoices.Select(i =>
        {
            paidByOrderId.TryGetValue(i.OrderId, out var payment);

            return new InvoiceSummaryDto(
                i.InvoiceId, i.InvoiceNumber, i.OrderId,
                i.GrandTotal, i.GstType, i.PaymentMode,
                i.GeneratedAt, i.IsSentToDealer,
                payment?.Status ?? "Unpaid",
                payment?.PaymentMode ?? i.PaymentMode,
                payment?.ReferenceNo,
                payment?.PaidAt
            );
        }).ToList();
    }
}
