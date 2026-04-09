using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Password;

public class ResetPasswordWithOtpCommandHandler : IRequestHandler<ResetPasswordWithOtpCommand, string>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public ResetPasswordWithOtpCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(ResetPasswordWithOtpCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailAsync(command.Email, ct)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.Role != UserRole.Dealer)
            throw new UnauthorizedAccessException("Only dealer accounts are supported for this flow.");

        var otpRecord = await _userRepository.GetLatestActiveOtpAsync(command.Email, OtpPurpose.ForgotPassword, ct)
            ?? throw new InvalidOperationException("OTP not found. Please request a new OTP.");

        if (!otpRecord.IsValid())
            throw new InvalidOperationException("OTP expired. Please request a new OTP.");

        if (!_passwordHasher.Verify(command.Otp, otpRecord.OtpHash))
            throw new UnauthorizedAccessException("Invalid OTP.");

        user.UpdatePasswordHash(_passwordHasher.Hash(command.NewPassword));
        otpRecord.MarkUsed();

        await _userRepository.SaveChangesAsync(ct);

        return "Password reset successful.";
    }
}