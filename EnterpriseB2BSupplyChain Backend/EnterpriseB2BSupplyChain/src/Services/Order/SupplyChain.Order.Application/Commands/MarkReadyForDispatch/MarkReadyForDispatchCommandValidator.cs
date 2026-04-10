using FluentValidation;

namespace SupplyChain.Order.Application.Commands.MarkReadyForDispatch;

public class MarkReadyForDispatchCommandValidator : AbstractValidator<MarkReadyForDispatchCommand>
{
    public MarkReadyForDispatchCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.WarehouseManagerId)
            .NotEmpty().WithMessage("WarehouseManagerId is required.");
    }
}
