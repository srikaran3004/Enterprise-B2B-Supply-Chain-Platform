using MediatR;
using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Commands.Login;

public record VerifyDealerLoginOtpCommand(
    string Email,
    string Otp
) : IRequest<AuthResultDto>;