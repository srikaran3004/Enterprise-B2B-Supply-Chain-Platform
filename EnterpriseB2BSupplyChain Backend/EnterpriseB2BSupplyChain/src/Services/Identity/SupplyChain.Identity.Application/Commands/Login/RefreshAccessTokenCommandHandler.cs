using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Login;

public class RefreshAccessTokenCommandHandler : IRequestHandler<RefreshAccessTokenCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;

    public RefreshAccessTokenCommandHandler(IUserRepository userRepository, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
    }

    public async Task<AuthResultDto> Handle(RefreshAccessTokenCommand command, CancellationToken ct)
    {
        var tokenHash = _tokenService.HashToken(command.RefreshToken);
        var existingToken = await _userRepository.GetRefreshTokenByHashAsync(tokenHash, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (existingToken.IsRevoked)
        {
            var revokedAt = existingToken.RevokedAt ?? DateTime.UtcNow;
            var isLikelyConcurrentRefresh = revokedAt >= DateTime.UtcNow.AddSeconds(-10);

            if (!isLikelyConcurrentRefresh)
            {
                await _userRepository.RevokeAllActiveRefreshTokensAsync(existingToken.UserId, ct);
            }

            throw new UnauthorizedAccessException("Your session has expired. Please sign in again.");
        }

        if (existingToken.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token is expired or revoked.");

        var user = await _userRepository.GetByIdAsync(existingToken.UserId, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (user.Status != UserStatus.Active)
            throw new UnauthorizedAccessException("Your account is not active.");

        existingToken.Revoke();

        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = _tokenService.HashToken(newRefreshToken);

        await _userRepository.AddRefreshTokenAsync(
            RefreshToken.Create(user.UserId, newRefreshTokenHash),
            ct);

        var accessToken = _tokenService.GenerateAccessToken(user);
        await _userRepository.SaveChangesAsync(ct);

        return new AuthResultDto(
            AccessToken: accessToken,
            ExpiresInSeconds: 3600,
            RefreshToken: newRefreshToken,
            Role: user.Role.ToString(),
            FullName: user.FullName,
            UserId: user.UserId,
            RequiresOtp: false,
            Message: "Token refreshed successfully."
        );
    }
}
