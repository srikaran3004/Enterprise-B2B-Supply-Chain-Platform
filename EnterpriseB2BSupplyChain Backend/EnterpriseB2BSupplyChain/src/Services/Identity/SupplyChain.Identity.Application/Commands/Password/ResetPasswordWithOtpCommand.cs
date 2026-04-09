using MediatR;

namespace SupplyChain.Identity.Application.Commands.Password;

public record ResetPasswordWithOtpCommand(
    string Email,
    string Otp,
    string NewPassword
) : IRequest<string>;