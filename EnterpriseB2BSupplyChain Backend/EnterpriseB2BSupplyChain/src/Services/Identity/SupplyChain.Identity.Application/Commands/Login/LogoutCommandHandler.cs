using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.Login;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, string>
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;

    public LogoutCommandHandler(IUserRepository userRepository, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
    }

    public async Task<string> Handle(LogoutCommand command, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(command.RefreshToken))
        {
            return "Logged out successfully.";
        }

        var tokenHash = _tokenService.HashToken(command.RefreshToken);
        var existingToken = await _userRepository.GetRefreshTokenByHashAsync(tokenHash, ct);
        if (existingToken is null)
        {
            return "Logged out successfully.";
        }

        await _userRepository.RevokeAllActiveRefreshTokensAsync(existingToken.UserId, ct);
        return "Logged out successfully.";
    }
}
