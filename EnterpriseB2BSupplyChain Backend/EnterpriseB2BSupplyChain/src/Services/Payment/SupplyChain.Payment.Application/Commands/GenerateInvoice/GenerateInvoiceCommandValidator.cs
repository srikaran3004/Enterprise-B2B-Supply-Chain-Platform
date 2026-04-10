using FluentValidation;

namespace SupplyChain.Payment.Application.Commands.GenerateInvoice;

public class GenerateInvoiceCommandValidator : AbstractValidator<GenerateInvoiceCommand>
{
    public GenerateInvoiceCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero.");

        RuleFor(x => x.PaymentMode)
            .NotEmpty().WithMessage("Payment mode is required.")
            .Must(IsSupportedPaymentMode)
            .WithMessage("Payment mode must be COD or PrePaid.");

        RuleFor(x => x.Lines)
            .NotNull().WithMessage("Invoice lines are required.")
            .NotEmpty().WithMessage("Invoice must contain at least one line.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductId)
                .NotEmpty().WithMessage("ProductId is required.");

            line.RuleFor(l => l.ProductName)
                .NotEmpty().WithMessage("Product name is required.")
                .MaximumLength(200).WithMessage("Product name must not exceed 200 characters.");

            line.RuleFor(l => l.SKU)
                .NotEmpty().WithMessage("SKU is required.")
                .MaximumLength(100).WithMessage("SKU must not exceed 100 characters.");

            line.RuleFor(l => l.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than zero.");

            line.RuleFor(l => l.UnitPrice)
                .GreaterThan(0).WithMessage("Unit price must be greater than zero.");
        });
    }

    private static bool IsSupportedPaymentMode(string paymentMode)
        => paymentMode.Equals("COD", StringComparison.OrdinalIgnoreCase)
           || paymentMode.Equals("PrePaid", StringComparison.OrdinalIgnoreCase)
           || paymentMode.Equals("Prepaid", StringComparison.OrdinalIgnoreCase);
}
