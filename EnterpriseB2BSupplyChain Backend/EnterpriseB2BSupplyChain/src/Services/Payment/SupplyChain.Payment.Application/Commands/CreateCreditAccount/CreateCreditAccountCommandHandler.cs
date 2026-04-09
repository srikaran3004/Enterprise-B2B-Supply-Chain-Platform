using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Commands.CreateCreditAccount;

public class CreateCreditAccountCommandHandler : IRequestHandler<CreateCreditAccountCommand, Guid>
{
    private readonly ICreditAccountRepository _creditRepository;

    public CreateCreditAccountCommandHandler(ICreditAccountRepository creditRepository)
        => _creditRepository = creditRepository;

    public async Task<Guid> Handle(CreateCreditAccountCommand command, CancellationToken ct)
    {
        var existing = await _creditRepository.GetByDealerIdAsync(command.DealerId, ct);
        if (existing is not null)
        {
            if (existing.CreditLimit != command.CreditLimit)
            {
                existing.UpdateCreditLimit(command.CreditLimit);
                await _creditRepository.SaveChangesAsync(ct);
            }
            return existing.AccountId;
        }

        var account = DealerCreditAccount.Create(command.DealerId, command.CreditLimit);
        await _creditRepository.AddAsync(account, ct);
        await _creditRepository.SaveChangesAsync(ct);
        return account.AccountId;
    }
}
