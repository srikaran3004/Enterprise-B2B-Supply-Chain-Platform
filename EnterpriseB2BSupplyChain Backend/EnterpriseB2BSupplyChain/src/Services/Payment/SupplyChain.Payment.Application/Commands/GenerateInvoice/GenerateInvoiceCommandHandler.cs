using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Commands.GenerateInvoice;

public class GenerateInvoiceCommandHandler : IRequestHandler<GenerateInvoiceCommand, Guid>
{
    private readonly IInvoiceRepository      _invoiceRepository;
    private readonly ICreditAccountRepository _creditRepository;
    private readonly IPaymentRecordRepository _paymentRecordRepository;
    private readonly IInvoicePdfService      _pdfService;
    private readonly IOutboxRepository _outboxRepository;

    public GenerateInvoiceCommandHandler(
        IInvoiceRepository       invoiceRepository,
        ICreditAccountRepository creditRepository,
        IPaymentRecordRepository paymentRecordRepository,
        IInvoicePdfService       pdfService,
        IOutboxRepository        outboxRepository)
    {
        _invoiceRepository = invoiceRepository;
        _creditRepository  = creditRepository;
        _paymentRecordRepository = paymentRecordRepository;
        _pdfService        = pdfService;
        _outboxRepository  = outboxRepository;
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
        var existingPaymentRecord = await _paymentRecordRepository.GetByOrderIdAsync(command.OrderId, ct);
        var hasReservedCredit = existingPaymentRecord is not null
            && string.Equals(existingPaymentRecord.PaymentMode, "Credit", StringComparison.OrdinalIgnoreCase);

        if (account is not null &&
            string.Equals(command.PaymentMode, "Credit", StringComparison.OrdinalIgnoreCase))
        {
            if (hasReservedCredit)
            {
                account.FinalizeReserve(command.TotalAmount);
            }
            else
            {
                account.AddOutstanding(command.TotalAmount);
            }
        }

        var invoiceGenerated = OutboxMessage.Create("InvoiceGenerated", JsonSerializer.Serialize(new
        {
            invoice.InvoiceId,
            invoice.InvoiceNumber,
            invoice.OrderId,
            invoice.DealerId,
            command.DealerEmail,
            command.DealerName,
            invoice.GrandTotal,
            invoice.PaymentMode
        }));

        await _outboxRepository.AddAsync(invoiceGenerated, ct);

        await _invoiceRepository.SaveChangesAsync(ct);

        return invoice.InvoiceId;
    }
}
