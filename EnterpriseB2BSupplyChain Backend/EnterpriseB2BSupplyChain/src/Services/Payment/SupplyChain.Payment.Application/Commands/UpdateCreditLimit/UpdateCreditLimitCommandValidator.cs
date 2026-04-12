using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.UpdateCreditLimit;

public class UpdateCreditLimitCommandValidator : AbstractValidator<UpdateCreditLimitCommand>
{
    public UpdateCreditLimitCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.NewLimit)
            .GreaterThan(0).WithMessage("Monthly purchase limit must be greater than zero.")
            .LessThanOrEqualTo(10_000_000m).WithMessage("Monthly purchase limit cannot exceed ₹1,00,00,000.");
    }
}
