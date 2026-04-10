using FluentValidation;

namespace SupplyChain.Order.Application.Commands.MarkInTransit;

public class MarkInTransitCommandValidator : AbstractValidator<MarkInTransitCommand>
{
    public MarkInTransitCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.ActorId)
            .NotEmpty().WithMessage("ActorId is required.");
    }
}
