using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.CheckCredit;

public class CheckCreditQueryHandler : IRequestHandler<CheckCreditQuery, CreditCheckDto>
{
    private readonly ICreditAccountRepository _creditRepository;

    public CheckCreditQueryHandler(ICreditAccountRepository creditRepository)
    {
        _creditRepository = creditRepository;
    }

    public async Task<CreditCheckDto> Handle(CheckCreditQuery query, CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(query.DealerId, ct);

        if (account is null)
            return new CreditCheckDto(true, 500_000m, 500_000m, 0);

        if (account.EnsureMonthlyReset(DateTime.UtcNow))
            await _creditRepository.SaveChangesAsync(ct);

        var availableLimit = Math.Max(0, account.CreditLimit - account.CurrentOutstanding);

        return new CreditCheckDto(
            Approved:      availableLimit >= query.Amount,
            AvailableLimit: availableLimit,
            PurchaseLimit: account.CreditLimit,
            UtilizedAmount: account.CurrentOutstanding
        );
    }
}
