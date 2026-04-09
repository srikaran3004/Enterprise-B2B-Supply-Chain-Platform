using FluentValidation;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.CreateStaffUser;

public class CreateStaffUserCommandValidator : AbstractValidator<CreateStaffUserCommand>
{
    public CreateStaffUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().EmailAddress().MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]")
            .Matches("[0-9]");

        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(BeAllowedRole)
            .WithMessage("Role must be Admin or DeliveryAgent.");
    }

    private static bool BeAllowedRole(string role)
        => Enum.TryParse<UserRole>(role, true, out var parsed)
           && parsed is UserRole.Admin
               or UserRole.DeliveryAgent;
}
