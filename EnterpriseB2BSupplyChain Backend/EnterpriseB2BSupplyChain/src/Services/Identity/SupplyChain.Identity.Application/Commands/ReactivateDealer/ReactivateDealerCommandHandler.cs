using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.ReactivateDealer;

public class ReactivateDealerCommandHandler : IRequestHandler<ReactivateDealerCommand>
{
    private readonly IUserRepository _userRepository;

    public ReactivateDealerCommandHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task Handle(ReactivateDealerCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {command.DealerId} not found.");

        user.Reactivate();
        await _userRepository.SaveChangesAsync(ct);
    }
}
