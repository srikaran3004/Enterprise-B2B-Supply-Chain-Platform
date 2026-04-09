using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.GetInvoiceById;

public class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, InvoiceDto>
{
    private readonly IInvoiceRepository _invoiceRepository;

    public GetInvoiceByIdQueryHandler(IInvoiceRepository invoiceRepository)
        => _invoiceRepository = invoiceRepository;

    public async Task<InvoiceDto> Handle(GetInvoiceByIdQuery query, CancellationToken ct)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(query.InvoiceId, ct)
            ?? throw new KeyNotFoundException($"Invoice {query.InvoiceId} not found.");

        return new InvoiceDto(
            invoice.InvoiceId, invoice.InvoiceNumber,
            invoice.OrderId,   invoice.DealerId,
            invoice.Subtotal,  invoice.GstType,
            invoice.GstRate,   invoice.GstAmount,
            invoice.GrandTotal, invoice.PaymentMode,
            invoice.PdfStoragePath, invoice.GeneratedAt,
            invoice.Lines.Select(l =>
                new InvoiceLineDto(l.ProductName, l.SKU, l.Quantity, l.UnitPrice, l.LineTotal)
            ).ToList()
        );
    }
}
