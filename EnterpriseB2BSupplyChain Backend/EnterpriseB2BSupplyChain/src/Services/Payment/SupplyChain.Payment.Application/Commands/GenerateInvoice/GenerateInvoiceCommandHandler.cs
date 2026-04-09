using System.Security.Cryptography;
using System.Text;
using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Commands.GenerateInvoice;

public class GenerateInvoiceCommandHandler : IRequestHandler<GenerateInvoiceCommand, Guid>
{
    private readonly IInvoiceRepository      _invoiceRepository;
    private readonly ICreditAccountRepository _creditRepository;
    private readonly IInvoicePdfService      _pdfService;

    public GenerateInvoiceCommandHandler(
        IInvoiceRepository       invoiceRepository,
        ICreditAccountRepository creditRepository,
        IInvoicePdfService       pdfService)
    {
        _invoiceRepository = invoiceRepository;
        _creditRepository  = creditRepository;
        _pdfService        = pdfService;
    }

    public async Task<Guid> Handle(GenerateInvoiceCommand command, CancellationToken ct)
    {
        var idempotencyKey = Convert.ToBase64String(
            SHA256.HashData(Encoding.UTF8.GetBytes($"{command.OrderId}{command.DealerId}")));

        var existing = await _invoiceRepository.GetByIdempotencyKeyAsync(idempotencyKey, ct);
        if (existing is not null)
            return existing.InvoiceId;

        var count         = await _invoiceRepository.CountAsync(ct);
        var invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{(count + 1):D5}";

        var invoiceId = Guid.NewGuid();
        var lines = command.Lines.Select(l =>
            InvoiceLine.Create(invoiceId, l.ProductName, l.SKU, l.Quantity, l.UnitPrice)
        ).ToList();

        var invoice = Invoice.Create(
            orderId:        command.OrderId,
            dealerId:       command.DealerId,
            invoiceNumber:  invoiceNumber,
            idempotencyKey: idempotencyKey,
            lines:          lines,
            isInterstate:   command.IsInterstate,
            paymentMode:    command.PaymentMode
        );

        var pdfPath = await _pdfService.GenerateAsync(invoice, ct);
        invoice.SetPdfPath(pdfPath);

        await _invoiceRepository.AddAsync(invoice, ct);

        var account = await _creditRepository.GetByDealerIdAsync(command.DealerId, ct);
        account?.ReduceOutstanding(command.TotalAmount);

        await _invoiceRepository.SaveChangesAsync(ct);

        return invoice.InvoiceId;
    }
}
