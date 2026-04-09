using SupplyChain.Logistics.Domain.Events;

namespace SupplyChain.Logistics.Application.Abstractions;

public interface IAgentAssignedEventPublisher
{
    Task PublishAsync(AgentAssigned @event, CancellationToken ct);
}
