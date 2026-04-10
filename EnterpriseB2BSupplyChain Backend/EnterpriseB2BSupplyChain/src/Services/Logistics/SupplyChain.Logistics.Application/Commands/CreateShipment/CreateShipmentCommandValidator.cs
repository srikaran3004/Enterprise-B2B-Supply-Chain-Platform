using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.CreateShipment;

public class CreateShipmentCommandValidator : AbstractValidator<CreateShipmentCommand>
{
    public CreateShipmentCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.SlaDeadlineUtc)
            .Must(deadline => deadline > DateTime.UtcNow)
            .WithMessage("SLA deadline must be a future UTC time.");
    }
}
