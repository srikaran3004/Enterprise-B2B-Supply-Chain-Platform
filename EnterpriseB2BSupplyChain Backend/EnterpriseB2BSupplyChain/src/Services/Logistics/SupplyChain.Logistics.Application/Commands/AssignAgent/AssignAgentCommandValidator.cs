using FluentValidation;

namespace SupplyChain.Logistics.Application.Commands.AssignAgent;

public class AssignAgentCommandValidator : AbstractValidator<AssignAgentCommand>
{
    public AssignAgentCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");

        RuleFor(x => x.AgentId)
            .NotEmpty().WithMessage("AgentId is required.");

        RuleFor(x => x.VehicleId)
            .NotEmpty().WithMessage("VehicleId is required.");

        RuleFor(x => x.SlaDeadlineUtc)
            .Must(deadline => deadline is null || deadline.Value > DateTime.UtcNow)
            .WithMessage("SLA deadline must be a future UTC time when provided.");
    }
}
