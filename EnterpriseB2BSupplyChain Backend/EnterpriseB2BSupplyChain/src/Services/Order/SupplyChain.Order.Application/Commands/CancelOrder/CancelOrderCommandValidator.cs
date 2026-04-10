using FluentValidation;

namespace SupplyChain.Order.Application.Commands.CancelOrder;

public class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.ActorId)
            .NotEmpty().WithMessage("ActorId is required.");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Cancellation reason is required.")
            .MaximumLength(500).WithMessage("Cancellation reason must not exceed 500 characters.");

        RuleFor(x => x.DealerEmail)
            .EmailAddress().WithMessage("Dealer email is invalid.")
            .MaximumLength(256).WithMessage("Dealer email must not exceed 256 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.DealerEmail));

        RuleFor(x => x.DealerId)
            .Must(id => id is null || id.Value != Guid.Empty)
            .WithMessage("DealerId must be a valid non-empty GUID when provided.");
    }
}
