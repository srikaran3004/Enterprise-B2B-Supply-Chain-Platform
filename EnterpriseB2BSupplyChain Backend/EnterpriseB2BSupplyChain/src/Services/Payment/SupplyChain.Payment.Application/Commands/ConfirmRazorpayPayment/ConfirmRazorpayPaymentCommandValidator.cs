using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;

public class ConfirmRazorpayPaymentCommandValidator : AbstractValidator<ConfirmRazorpayPaymentCommand>
{
    public ConfirmRazorpayPaymentCommandValidator()
    {
        RuleFor(x => x.RazorpayOrderId)
            .NotEmpty().WithMessage("Razorpay order ID is required.")
            .MaximumLength(100).WithMessage("Razorpay order ID must not exceed 100 characters.");

        RuleFor(x => x.RazorpayPaymentId)
            .NotEmpty().WithMessage("Razorpay payment ID is required.")
            .MaximumLength(100).WithMessage("Razorpay payment ID must not exceed 100 characters.");

        RuleFor(x => x.RazorpaySignature)
            .NotEmpty().WithMessage("Razorpay signature is required.")
            .Matches("^[a-fA-F0-9]{64}$")
            .WithMessage("Razorpay signature must be a 64-character hex hash.");

        RuleFor(x => x.OrderId)
            .Must(id => id is null || id.Value != Guid.Empty)
            .WithMessage("OrderId must be a valid non-empty GUID when provided.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero when provided.")
            .When(x => x.Amount.HasValue);
    }
}
