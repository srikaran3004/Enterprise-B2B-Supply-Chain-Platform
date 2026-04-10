using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Login;

public class VerifyDealerLoginOtpCommandHandler : IRequestHandler<VerifyDealerLoginOtpCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public VerifyDealerLoginOtpCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResultDto> Handle(VerifyDealerLoginOtpCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailAsync(command.Email, ct)
            ?? throw new UnauthorizedAccessException("Invalid login verification request.");

        if (user.Role != UserRole.Dealer)
            throw new UnauthorizedAccessException("OTP login verification is only for dealer accounts.");

        if (user.Status != UserStatus.Active)
            throw new UnauthorizedAccessException("Your account is not active.");

        var otpRecord = await _userRepository.GetLatestActiveOtpAsync(command.Email, OtpPurpose.DealerLogin, ct)
            ?? throw new InvalidOperationException("OTP not found. Please login again to request OTP.");

        if (!otpRecord.IsValid())
            throw new InvalidOperationException("OTP expired. Please login again to request OTP.");

        if (!_passwordHasher.Verify(command.Otp, otpRecord.OtpHash))
            throw new UnauthorizedAccessException("Invalid OTP.");

        otpRecord.MarkUsed();

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(refreshToken);

        var refreshTokenEntity = Domain.Entities.RefreshToken.Create(user.UserId, tokenHash);
        await _userRepository.AddRefreshTokenAsync(refreshTokenEntity, ct);
        await _userRepository.SaveChangesAsync(ct);

        return new AuthResultDto(
            AccessToken: accessToken,
            ExpiresInSeconds: 3600,
            RefreshToken: refreshToken,
            Role: user.Role.ToString(),
            FullName: user.FullName,
            UserId: user.UserId,
            RequiresOtp: false,
            Message: "Login successful."
        );
    }
}
