using FluentValidation;

namespace SupplyChain.Order.Application.Commands.Returns;

public class ApproveReturnCommandValidator : AbstractValidator<ApproveReturnCommand>
{
    public ApproveReturnCommandValidator()
    {
        RuleFor(x => x.ReturnId)
            .NotEmpty().WithMessage("ReturnId is required.");

        RuleFor(x => x.AdminId)
            .NotEmpty().WithMessage("AdminId is required.");

        RuleFor(x => x.AdminNotes)
            .MaximumLength(1000).WithMessage("Admin notes must not exceed 1000 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.AdminNotes));
    }
}

public class RejectReturnCommandValidator : AbstractValidator<RejectReturnCommand>
{
    public RejectReturnCommandValidator()
    {
        RuleFor(x => x.ReturnId)
            .NotEmpty().WithMessage("ReturnId is required.");

        RuleFor(x => x.AdminId)
            .NotEmpty().WithMessage("AdminId is required.");

        RuleFor(x => x.AdminNotes)
            .MaximumLength(1000).WithMessage("Admin notes must not exceed 1000 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.AdminNotes));
    }
}
