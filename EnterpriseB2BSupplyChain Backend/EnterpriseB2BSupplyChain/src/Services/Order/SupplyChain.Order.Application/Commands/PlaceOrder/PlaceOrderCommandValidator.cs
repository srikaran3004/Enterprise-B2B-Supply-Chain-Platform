using FluentValidation;

namespace SupplyChain.Order.Application.Commands.PlaceOrder;

public class PlaceOrderCommandValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("Dealer ID is required.");

        RuleFor(x => x.Lines)
            .NotNull().NotEmpty().WithMessage("Order must have at least one product.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductId).NotEmpty();
            line.RuleFor(l => l.Quantity).GreaterThan(0).WithMessage("Quantity must be at least 1.");
            line.RuleFor(l => l.UnitPrice).GreaterThan(0).WithMessage("Unit price must be greater than zero.");
            line.RuleFor(l => l.ProductName).NotEmpty();
            line.RuleFor(l => l.SKU).NotEmpty();
        });

        RuleFor(x => x.PaymentMode)
            .NotEmpty()
            .Must(m => m == "COD" || m == "PrePaid")
            .WithMessage("Payment mode must be COD or PrePaid.");
    }
}
