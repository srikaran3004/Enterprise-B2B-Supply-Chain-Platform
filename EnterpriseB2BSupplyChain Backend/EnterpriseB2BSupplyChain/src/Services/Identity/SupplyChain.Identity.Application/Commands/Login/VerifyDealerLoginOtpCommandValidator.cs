using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.Login;

public class VerifyDealerLoginOtpCommandValidator : AbstractValidator<VerifyDealerLoginOtpCommand>
{
    public VerifyDealerLoginOtpCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Otp)
            .NotEmpty()
            .Length(6)
            .Matches("^[0-9]{6}$");
    }
}