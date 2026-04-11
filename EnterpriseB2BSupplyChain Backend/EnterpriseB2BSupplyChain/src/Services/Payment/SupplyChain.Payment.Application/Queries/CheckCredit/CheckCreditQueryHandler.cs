using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.CheckCredit;

public class CheckCreditQueryHandler : IRequestHandler<CheckCreditQuery, CreditCheckDto>
{
    private readonly ICreditAccountRepository _creditRepository;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRecordRepository _paymentRecordRepository;

    public CheckCreditQueryHandler(
        ICreditAccountRepository creditRepository,
        IInvoiceRepository invoiceRepository,
        IPaymentRecordRepository paymentRecordRepository)
    {
        _creditRepository = creditRepository;
        _invoiceRepository = invoiceRepository;
        _paymentRecordRepository = paymentRecordRepository;
    }

    public async Task<CreditCheckDto> Handle(CheckCreditQuery query, CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(query.DealerId, ct);

        if (account is null)
            return new CreditCheckDto(true, 500_000m, 500_000m, 0);

        var invoices = await _invoiceRepository.GetByDealerIdAsync(query.DealerId, ct);
        var payments = await _paymentRecordRepository.GetByOrderIdsAsync(invoices.Select(i => i.OrderId), ct);

        var paidOrderIds = payments
            .Where(p => string.Equals(p.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            .Select(p => p.OrderId)
            .ToHashSet();

        var liveOutstanding = invoices
            .Where(i => !paidOrderIds.Contains(i.OrderId))
            .Sum(i => i.GrandTotal);

        var effectiveOutstanding = Math.Max(account.CurrentOutstanding, liveOutstanding);
        var availableCredit = Math.Max(0, account.CreditLimit - effectiveOutstanding);

        return new CreditCheckDto(
            Approved:           availableCredit >= query.Amount,
            AvailableCredit:    availableCredit,
            CreditLimit:        account.CreditLimit,
            CurrentOutstanding: effectiveOutstanding
        );
    }
}
