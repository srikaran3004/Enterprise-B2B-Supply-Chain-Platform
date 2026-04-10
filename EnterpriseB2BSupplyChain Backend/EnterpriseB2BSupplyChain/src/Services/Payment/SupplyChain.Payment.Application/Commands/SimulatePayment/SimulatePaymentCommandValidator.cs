using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.SimulatePayment;

public class SimulatePaymentCommandValidator : AbstractValidator<SimulatePaymentCommand>
{
    public SimulatePaymentCommandValidator()
    {
        RuleFor(x => x.RazorpayOrderId)
            .NotEmpty().WithMessage("Razorpay order ID is required.")
            .MaximumLength(100).WithMessage("Razorpay order ID must not exceed 100 characters.");
    }
}
