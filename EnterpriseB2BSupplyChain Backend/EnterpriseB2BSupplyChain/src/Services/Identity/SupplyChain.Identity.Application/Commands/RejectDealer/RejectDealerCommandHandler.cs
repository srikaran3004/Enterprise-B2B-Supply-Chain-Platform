using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.RejectDealer;

public class RejectDealerCommandHandler : IRequestHandler<RejectDealerCommand>
{
    private readonly IUserRepository _userRepository;

    public RejectDealerCommandHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task Handle(RejectDealerCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {command.DealerId} not found.");

        user.Reject(command.AdminId);
        await _userRepository.SaveChangesAsync(ct);
    }
}