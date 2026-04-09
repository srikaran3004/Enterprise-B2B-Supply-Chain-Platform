using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.ApproveDealer;

public class ApproveDealerCommandHandler : IRequestHandler<ApproveDealerCommand>
{
    private readonly IUserRepository _userRepository;

    public ApproveDealerCommandHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task Handle(ApproveDealerCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {command.DealerId} not found.");

        user.Approve(command.AdminId);
        user.DealerProfile?.MarkApproved(command.AdminId);

        await _userRepository.SaveChangesAsync(ct);
    }
}