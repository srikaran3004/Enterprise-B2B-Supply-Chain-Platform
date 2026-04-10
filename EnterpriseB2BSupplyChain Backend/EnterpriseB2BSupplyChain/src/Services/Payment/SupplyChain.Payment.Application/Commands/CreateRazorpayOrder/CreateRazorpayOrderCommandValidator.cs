using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.CreateRazorpayOrder;

public class CreateRazorpayOrderCommandValidator : AbstractValidator<CreateRazorpayOrderCommand>
{
    public CreateRazorpayOrderCommandValidator()
    {
        RuleFor(x => x.AmountInInr)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.")
            .LessThanOrEqualTo(1_000_000m).WithMessage("Amount cannot exceed 10,00,000 INR per request.");

        RuleFor(x => x.ReceiptId)
            .NotEmpty().WithMessage("Receipt ID is required.")
            .MaximumLength(100).WithMessage("Receipt ID must not exceed 100 characters.");
    }
}
