using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.CreateAgent;

public class CreateAgentCommandValidator : AbstractValidator<CreateAgentCommand>
{
    public CreateAgentCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("UserId is required.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(200).WithMessage("Full name must not exceed 200 characters.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^\+?[0-9]{7,15}$")
            .WithMessage("Phone number must contain 7 to 15 digits.");

        RuleFor(x => x.LicenseNumber)
            .MaximumLength(100).WithMessage("License number must not exceed 100 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.LicenseNumber));

        RuleFor(x => x.ServiceRegion)
            .MaximumLength(100).WithMessage("Service region must not exceed 100 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.ServiceRegion));
    }
}
