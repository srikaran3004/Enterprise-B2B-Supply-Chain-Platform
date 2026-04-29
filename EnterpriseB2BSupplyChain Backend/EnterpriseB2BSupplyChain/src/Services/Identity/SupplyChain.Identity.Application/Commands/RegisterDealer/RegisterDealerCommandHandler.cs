using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;
using System.Text.Json;

namespace SupplyChain.Identity.Application.Commands.RegisterDealer;

public class RegisterDealerCommandHandler : IRequestHandler<RegisterDealerCommand, string>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailBackgroundJobDispatcher _emailDispatcher;

    public RegisterDealerCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IEmailBackgroundJobDispatcher emailDispatcher)
    {
        _userRepository  = userRepository;
        _passwordHasher  = passwordHasher;
        _emailDispatcher = emailDispatcher;
    }

    public async Task<string> Handle(RegisterDealerCommand command, CancellationToken ct)
    {
        if (await _userRepository.EmailExistsAsync(command.Email, ct))
            throw new InvalidOperationException($"Email '{command.Email}' is already registered.");

        if (await _userRepository.GstNumberExistsAsync(command.GstNumber, ct))
            throw new InvalidOperationException($"GST number '{command.GstNumber}' is already registered.");

        var passwordHash = _passwordHasher.Hash(command.Password);
        var payload = new PendingDealerRegistrationPayload(
            Email: command.Email,
            PasswordHash: passwordHash,
            FullName: command.FullName,
            PhoneNumber: command.PhoneNumber,
            BusinessName: command.BusinessName,
            GstNumber: command.GstNumber,
            AddressLine1: command.AddressLine1,
            City: command.City,
            State: command.State,
            PinCode: command.PinCode,
            IsInterstate: command.IsInterstate
        );

        var otp = Random.Shared.Next(100000, 1000000).ToString();
        var otpHash = _passwordHasher.Hash(otp);

        var otpRecord = OtpRecord.Create(
            email: command.Email,
            purpose: OtpPurpose.DealerRegistration,
            otpHash: otpHash,
            payloadJson: JsonSerializer.Serialize(payload),
            expiryMinutes: 15
        );

        await _userRepository.AddOtpRecordAsync(otpRecord, ct);
        await _userRepository.SaveChangesAsync(ct);

        // OTP is persisted — enqueue email delivery as a fire-and-forget background job.
        // If the broker/SMTP is temporarily unavailable, Hangfire retries automatically
        // without blocking the HTTP response.
        _emailDispatcher.EnqueueOtp(command.Email, "Dealer Registration OTP", otp, "dealer registration");

        return "OTP sent to your email. Verify OTP to complete registration.";
    }
}