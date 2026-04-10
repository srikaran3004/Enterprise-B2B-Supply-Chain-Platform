using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.CreateVehicle;

public class CreateVehicleCommandValidator : AbstractValidator<CreateVehicleCommand>
{
    public CreateVehicleCommandValidator()
    {
        RuleFor(x => x.RegistrationNo)
            .NotEmpty().WithMessage("Registration number is required.")
            .MaximumLength(20).WithMessage("Registration number must not exceed 20 characters.")
            .Matches(@"^[A-Za-z0-9\-\s]+$")
            .WithMessage("Registration number can contain letters, numbers, spaces, and hyphens only.");

        RuleFor(x => x.VehicleType)
            .NotEmpty().WithMessage("Vehicle type is required.")
            .MaximumLength(50).WithMessage("Vehicle type must not exceed 50 characters.");

        RuleFor(x => x.CapacityKg)
            .GreaterThan(0).WithMessage("Capacity must be greater than zero.")
            .LessThanOrEqualTo(100000).WithMessage("Capacity cannot exceed 100000 kg.")
            .When(x => x.CapacityKg.HasValue);
    }
}
