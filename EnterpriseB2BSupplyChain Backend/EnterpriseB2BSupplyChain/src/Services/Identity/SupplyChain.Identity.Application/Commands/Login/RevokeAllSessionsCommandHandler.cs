using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.Login;

public class RevokeAllSessionsCommandHandler : IRequestHandler<RevokeAllSessionsCommand, string>
{
    private readonly IUserRepository _userRepository;

    public RevokeAllSessionsCommandHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task<string> Handle(RevokeAllSessionsCommand command, CancellationToken ct)
    {
        if (command.UserId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Invalid user session.");
        }

        await _userRepository.RevokeAllActiveRefreshTokensAsync(command.UserId, ct);
        return "All sessions revoked successfully.";
    }
}
