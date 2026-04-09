using FluentValidation;

namespace SupplyChain.Identity.Application.Commands.Password;

public class RequestForgotPasswordOtpCommandValidator : AbstractValidator<RequestForgotPasswordOtpCommand>
{
    public RequestForgotPasswordOtpCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();
    }
}