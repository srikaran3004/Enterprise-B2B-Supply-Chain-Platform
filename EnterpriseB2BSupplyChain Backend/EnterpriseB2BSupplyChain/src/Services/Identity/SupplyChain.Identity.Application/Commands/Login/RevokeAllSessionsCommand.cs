using MediatR;

namespace SupplyChain.Identity.Application.Commands.Login;

public record RevokeAllSessionsCommand(Guid UserId) : IRequest<string>;
