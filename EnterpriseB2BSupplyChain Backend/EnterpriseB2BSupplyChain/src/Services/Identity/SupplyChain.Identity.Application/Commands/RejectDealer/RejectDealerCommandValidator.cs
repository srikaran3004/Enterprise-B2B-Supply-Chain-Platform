using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.RejectDealer;

public class RejectDealerCommandValidator : AbstractValidator<RejectDealerCommand>
{
    public RejectDealerCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.AdminId)
            .NotEmpty().WithMessage("AdminId is required.");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Rejection reason is required.")
            .MaximumLength(500).WithMessage("Rejection reason must not exceed 500 characters.");

        RuleFor(x => x)
            .Must(x => x.DealerId != x.AdminId)
            .WithMessage("AdminId and DealerId cannot be the same.");
    }
}
