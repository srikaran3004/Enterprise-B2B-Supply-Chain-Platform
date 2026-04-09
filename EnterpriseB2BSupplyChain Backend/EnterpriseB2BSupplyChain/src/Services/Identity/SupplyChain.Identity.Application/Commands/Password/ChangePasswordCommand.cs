using MediatR;

namespace SupplyChain.Identity.Application.Commands.Password;

public record ChangePasswordCommand(
    Guid UserId,
    string CurrentPassword,
    string NewPassword
) : IRequest<string>;