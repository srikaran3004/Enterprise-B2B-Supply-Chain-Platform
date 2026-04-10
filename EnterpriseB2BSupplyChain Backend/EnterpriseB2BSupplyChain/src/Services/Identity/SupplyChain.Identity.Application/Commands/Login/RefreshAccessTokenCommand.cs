using MediatR;
using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Commands.Login;

public record RefreshAccessTokenCommand(string RefreshToken) : IRequest<AuthResultDto>;
