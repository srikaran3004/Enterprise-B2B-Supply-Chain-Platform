using MediatR;

namespace SupplyChain.Identity.Application.Commands.Login;

public record LogoutCommand(string? RefreshToken) : IRequest<string>;
