using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.ReactivateDealer;

public class ReactivateDealerCommandValidator : AbstractValidator<ReactivateDealerCommand>
{
    public ReactivateDealerCommandValidator()
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
