using FluentValidation;

namespace SupplyChain.Order.Application.Commands.RaiseReturn;

public class RaiseReturnCommandValidator : AbstractValidator<RaiseReturnCommand>
{
    public RaiseReturnCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.DealerId)
            .NotEmpty().WithMessage("DealerId is required.");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Return reason is required.")
            .MaximumLength(500).WithMessage("Return reason must not exceed 500 characters.");

        RuleFor(x => x.PhotoUrl)
            .MaximumLength(2048).WithMessage("Photo URL must not exceed 2048 characters.")
            .Must(BeValidPhotoUrl)
            .WithMessage("Photo URL must be a valid absolute HTTP/HTTPS URL or a valid API image path.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhotoUrl));
    }

    private static bool BeValidPhotoUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return true;
        }

        if (url.StartsWith("/api/orders/return-images/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
