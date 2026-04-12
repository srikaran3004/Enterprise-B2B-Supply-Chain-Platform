using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailService = emailService;
    }

    public async Task<AuthResultDto> Handle(LoginCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailForAuthAsync(command.Email, ct)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.Status == UserStatus.Pending)
            throw new UnauthorizedAccessException("Your account is pending Admin approval.");

        if (user.Status == UserStatus.Rejected)
            throw new UnauthorizedAccessException("Your account registration was rejected.");

        if (user.Status == UserStatus.Suspended)
            throw new UnauthorizedAccessException("Your account has been suspended.");

        if (!_passwordHasher.Verify(command.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.Role == UserRole.Dealer)
        {
            var otp = Random.Shared.Next(100000, 1000000).ToString();
            var otpHash = _passwordHasher.Hash(otp);

            await _userRepository.AddOtpRecordAsync(
                Domain.Entities.OtpRecord.Create(
                    email: user.Email,
                    purpose: OtpPurpose.DealerLogin,
                    otpHash: otpHash,
                    payloadJson: null,
                    expiryMinutes: 10), ct);

            await _userRepository.SaveChangesAsync(ct);
            await _emailService.SendOtpAsync(user.Email, "Login OTP", otp, "dealer login", ct);

            return new AuthResultDto(
                AccessToken: null,
                ExpiresInSeconds: 0,
                RefreshToken: null,
                Role: user.Role.ToString(),
                FullName: user.FullName,
                UserId: user.UserId,
                RequiresOtp: true,
                Message: "OTP sent to your email. Verify OTP to complete login."
            );
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(refreshToken);

        // Persist refresh token
        var refreshTokenEntity = Domain.Entities.RefreshToken.Create(user.UserId, tokenHash);
        await _userRepository.AddRefreshTokenAsync(refreshTokenEntity, ct);
        await _userRepository.SaveChangesAsync(ct);

        return new AuthResultDto(
            AccessToken: accessToken,
            // Use configured JWT lifetime so ExpiresInSeconds stays in sync with the real token expiry
            ExpiresInSeconds: _tokenService.GetTokenExpirySeconds(),
            RefreshToken: refreshToken,
            Role: user.Role.ToString(),
            FullName: user.FullName,
            UserId: user.UserId,
            RequiresOtp: false,
            Message: "Login successful."
        );
    }
}
