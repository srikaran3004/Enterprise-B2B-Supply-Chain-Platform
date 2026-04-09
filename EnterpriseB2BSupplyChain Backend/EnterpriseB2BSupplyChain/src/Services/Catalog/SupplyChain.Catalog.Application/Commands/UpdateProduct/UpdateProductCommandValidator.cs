using FluentValidation;

namespace SupplyChain.Catalog.Application.Commands.UpdateProduct;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.UnitPrice).GreaterThan(0);
        RuleFor(x => x.MinOrderQuantity).GreaterThan(0);
    }
}
