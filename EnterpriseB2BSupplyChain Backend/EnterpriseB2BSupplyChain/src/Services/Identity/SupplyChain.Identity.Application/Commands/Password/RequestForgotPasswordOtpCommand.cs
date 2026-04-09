using MediatR;

namespace SupplyChain.Identity.Application.Commands.Password;

public record RequestForgotPasswordOtpCommand(string Email) : IRequest<string>;