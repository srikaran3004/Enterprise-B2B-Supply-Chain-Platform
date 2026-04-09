using MediatR;

namespace SupplyChain.Identity.Application.Commands.CreateStaffUser;

public record CreateStaffUserCommand(
    string Email,
    string Password,
    string FullName,
    string? PhoneNumber,
    string Role
) : IRequest<Guid>;
