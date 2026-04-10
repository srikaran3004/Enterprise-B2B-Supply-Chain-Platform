using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.ApproveDealer;

public class ApproveDealerCommandValidator : AbstractValidator<ApproveDealerCommand>
{
    public ApproveDealerCommandValidator()
    {
        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.AdminId)
            .NotEmpty().WithMessage("AdminId is required.");

        RuleFor(x => x)
            .Must(x => x.DealerId != x.AdminId)
            .WithMessage("AdminId and DealerId cannot be the same.");
    }
}
