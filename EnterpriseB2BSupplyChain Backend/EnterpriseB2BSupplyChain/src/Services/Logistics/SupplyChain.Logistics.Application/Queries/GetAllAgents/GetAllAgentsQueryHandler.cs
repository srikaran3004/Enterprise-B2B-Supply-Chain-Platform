using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetAllAgents;

public record GetAllAgentsQuery : IRequest<List<AgentDto>>;

public class GetAllAgentsQueryHandler : IRequestHandler<GetAllAgentsQuery, List<AgentDto>>
{
    private readonly IAgentRepository _agentRepository;

    public GetAllAgentsQueryHandler(IAgentRepository agentRepository)
        => _agentRepository = agentRepository;

    public async Task<List<AgentDto>> Handle(GetAllAgentsQuery query, CancellationToken ct)
    {
        var agents = await _agentRepository.GetAllAsync(ct);

        return agents.Select(a => new AgentDto(
            a.AgentId, a.FullName, a.Phone,
            a.Status.ToString(), a.CurrentOrderId,
            a.ServiceRegion, a.AverageRating, a.TotalDeliveries,
            a.LicenseNumber
        )).ToList();
    }
}
