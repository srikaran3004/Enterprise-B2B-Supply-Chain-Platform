using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Password;

public class RequestForgotPasswordOtpCommandHandler : IRequestHandler<RequestForgotPasswordOtpCommand, string>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;

    public RequestForgotPasswordOtpCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    public async Task<string> Handle(RequestForgotPasswordOtpCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailForAuthAsync(command.Email, ct);

        if (user is null || user.Role != UserRole.Dealer)
            return "If the account exists, an OTP has been sent to the registered email.";

        var otp = Random.Shared.Next(100000, 1000000).ToString();
        var otpHash = _passwordHasher.Hash(otp);

        var otpRecord = OtpRecord.Create(
            email: command.Email,
            purpose: OtpPurpose.ForgotPassword,
            otpHash: otpHash,
            payloadJson: null,
            expiryMinutes: 15
        );

        await _userRepository.AddOtpRecordAsync(otpRecord, ct);
        await _userRepository.SaveChangesAsync(ct);

        await _emailService.SendOtpAsync(command.Email, "Password Reset OTP", otp, "forgot password", ct);

        return "If the account exists, an OTP has been sent to the registered email.";
    }
}