using MediatR;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Application.Commands.UpdateCreditLimit;

public class UpdateCreditLimitCommandHandler : IRequestHandler<UpdateCreditLimitCommand>
{
    private readonly ICreditAccountRepository _creditRepository;

    public UpdateCreditLimitCommandHandler(ICreditAccountRepository creditRepository)
        => _creditRepository = creditRepository;

    public async Task Handle(UpdateCreditLimitCommand command, CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(command.DealerId, ct);
        
        if (account is null)
        {
            // Auto-create credit account with the specified limit
            account = DealerCreditAccount.Create(command.DealerId, command.NewLimit);
            await _creditRepository.AddAsync(account, ct);
        }
        else
        {
            account.UpdateCreditLimit(command.NewLimit);
        }
        
        await _creditRepository.SaveChangesAsync(ct);
    }
}
