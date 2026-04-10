using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.DeleteDealer;

public class DeleteDealerCommandValidator : AbstractValidator<DeleteDealerCommand>
{
    public DeleteDealerCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.AdminId)
            .NotEmpty().WithMessage("AdminId is required.");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Deletion reason is required.")
            .MaximumLength(500).WithMessage("Deletion reason must not exceed 500 characters.");

        RuleFor(x => x)
            .Must(x => x.DealerId != x.AdminId)
            .WithMessage("AdminId and DealerId cannot be the same.");
    }
}
