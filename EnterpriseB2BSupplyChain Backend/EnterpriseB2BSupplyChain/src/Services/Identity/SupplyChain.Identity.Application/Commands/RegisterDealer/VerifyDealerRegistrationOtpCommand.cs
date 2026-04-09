using MediatR;

namespace SupplyChain.Identity.Application.Commands.RegisterDealer;

public record VerifyDealerRegistrationOtpCommand(
    string Email,
    string Otp
) : IRequest<Guid>;