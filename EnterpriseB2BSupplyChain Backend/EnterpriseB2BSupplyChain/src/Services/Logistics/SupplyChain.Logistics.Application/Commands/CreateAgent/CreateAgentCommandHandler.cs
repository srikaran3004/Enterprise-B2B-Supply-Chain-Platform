using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Application.Commands.CreateAgent;

public class CreateAgentCommandHandler : IRequestHandler<CreateAgentCommand, Guid>
{
    private readonly IAgentRepository _agentRepository;

    public CreateAgentCommandHandler(IAgentRepository agentRepository)
        => _agentRepository = agentRepository;

    public async Task<Guid> Handle(CreateAgentCommand command, CancellationToken ct)
    {
        var agent = DeliveryAgent.Create(
            command.UserId,
            command.FullName,
            command.Phone,
            command.LicenseNumber,
            command.ServiceRegion);

        await _agentRepository.AddAgentAsync(agent, ct);
        await _agentRepository.SaveChangesAsync(ct);
        return agent.AgentId;
    }
}
