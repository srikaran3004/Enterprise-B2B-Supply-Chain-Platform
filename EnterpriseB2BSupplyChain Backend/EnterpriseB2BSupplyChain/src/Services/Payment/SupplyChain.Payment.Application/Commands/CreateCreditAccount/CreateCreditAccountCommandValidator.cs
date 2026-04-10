using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.CreateCreditAccount;

public class CreateCreditAccountCommandValidator : AbstractValidator<CreateCreditAccountCommand>
{
    public CreateCreditAccountCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.CreditLimit)
            .GreaterThan(0).WithMessage("Credit limit must be greater than zero.")
            .LessThanOrEqualTo(10_000_000m).WithMessage("Credit limit cannot exceed 1,00,00,000.");
    }
}
