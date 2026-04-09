using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.RegisterDealer;

public class VerifyDealerRegistrationOtpCommandValidator : AbstractValidator<VerifyDealerRegistrationOtpCommand>
{
    public VerifyDealerRegistrationOtpCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().EmailAddress();

        RuleFor(x => x.Otp)
            .NotEmpty()
            .Length(6)
            .Matches("^[0-9]{6}$");
    }
}