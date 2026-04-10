using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.UpdateShipmentStatus;

public class UpdateShipmentStatusCommandValidator : AbstractValidator<UpdateShipmentStatusCommand>
{
    public UpdateShipmentStatusCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.AgentId)
            .NotEmpty().WithMessage("AgentId is required.");

        RuleFor(x => x.NewStatus)
            .IsInEnum().WithMessage("Shipment status is invalid.");

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90m, 90m).WithMessage("Latitude must be between -90 and 90.")
            .When(x => x.Latitude.HasValue);

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180m, 180m).WithMessage("Longitude must be between -180 and 180.")
            .When(x => x.Longitude.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes must not exceed 1000 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.Notes));

        RuleFor(x => x.Place)
            .MaximumLength(200).WithMessage("Place must not exceed 200 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.Place));
    }
}
