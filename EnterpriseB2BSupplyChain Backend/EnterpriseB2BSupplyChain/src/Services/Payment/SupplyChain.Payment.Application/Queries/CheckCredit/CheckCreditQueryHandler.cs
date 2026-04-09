using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.CheckCredit;

public class CheckCreditQueryHandler : IRequestHandler<CheckCreditQuery, CreditCheckDto>
{
    private readonly ICreditAccountRepository _creditRepository;

    public CheckCreditQueryHandler(ICreditAccountRepository creditRepository)
        => _creditRepository = creditRepository;

    public async Task<CreditCheckDto> Handle(CheckCreditQuery query, CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(query.DealerId, ct);

        if (account is null)
            return new CreditCheckDto(true, 500_000m, 500_000m, 0);

        return new CreditCheckDto(
            Approved:           account.CanAccommodate(query.Amount),
            AvailableCredit:    account.AvailableCredit,
            CreditLimit:        account.CreditLimit,
            CurrentOutstanding: account.CurrentOutstanding
        );
    }
}
