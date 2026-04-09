using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.RateShipment;

public class RateShipmentCommandValidator : AbstractValidator<RateShipmentCommand>
{
    public RateShipmentCommandValidator()
    {
        RuleFor(x => x.ShipmentId)
            .NotEmpty().WithMessage("ShipmentId is required.");

        RuleFor(x => x.Rating)
            .InclusiveBetween(1, 5).WithMessage("Rating must be between 1 and 5.");

        RuleFor(x => x.Feedback)
            .MaximumLength(1000).WithMessage("Feedback must not exceed 1000 characters.")
            .When(x => x.Feedback is not null);
    }
}
