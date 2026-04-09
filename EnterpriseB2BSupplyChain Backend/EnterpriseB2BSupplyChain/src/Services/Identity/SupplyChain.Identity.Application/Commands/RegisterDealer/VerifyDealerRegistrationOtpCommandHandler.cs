using System.Text.Json;
using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.RegisterDealer;

public class VerifyDealerRegistrationOtpCommandHandler : IRequestHandler<VerifyDealerRegistrationOtpCommand, Guid>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public VerifyDealerRegistrationOtpCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<Guid> Handle(VerifyDealerRegistrationOtpCommand command, CancellationToken ct)
    {
        var otpRecord = await _userRepository.GetLatestActiveOtpAsync(command.Email, OtpPurpose.DealerRegistration, ct)
            ?? throw new InvalidOperationException("OTP not found. Please request a new OTP.");

        if (!otpRecord.IsValid())
            throw new InvalidOperationException("OTP expired. Please request a new OTP.");

        if (!_passwordHasher.Verify(command.Otp, otpRecord.OtpHash))
            throw new UnauthorizedAccessException("Invalid OTP.");

        if (string.IsNullOrWhiteSpace(otpRecord.PayloadJson))
            throw new InvalidOperationException("Invalid OTP payload. Please re-register.");

        var payload = JsonSerializer.Deserialize<PendingDealerRegistrationPayload>(otpRecord.PayloadJson)
            ?? throw new InvalidOperationException("Invalid OTP payload. Please re-register.");

        if (await _userRepository.EmailExistsAsync(payload.Email, ct))
            throw new InvalidOperationException($"Email '{payload.Email}' is already registered.");

        if (await _userRepository.GstNumberExistsAsync(payload.GstNumber, ct))
            throw new InvalidOperationException($"GST number '{payload.GstNumber}' is already registered.");

        var user = User.CreateDealer(payload.Email, payload.PasswordHash, payload.FullName, payload.PhoneNumber);

        var profile = DealerProfile.Create(
            userId: user.UserId,
            businessName: payload.BusinessName,
            gstNumber: payload.GstNumber,
            addressLine1: payload.AddressLine1,
            city: payload.City,
            state: payload.State,
            pinCode: payload.PinCode,
            isInterstate: payload.IsInterstate
        );

        otpRecord.MarkUsed();

        await _userRepository.AddAsync(user, ct);
        await _userRepository.AddDealerProfileAsync(profile, ct);
        await _userRepository.SaveChangesAsync(ct);

        return user.UserId;
    }
}