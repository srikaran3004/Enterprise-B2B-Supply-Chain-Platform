using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.Application.Queries.GetAvailableAgents;

public class GetAvailableAgentsQueryHandler : IRequestHandler<GetAvailableAgentsQuery, List<AgentDto>>
{
    private readonly IAgentRepository _agentRepository;

    public GetAvailableAgentsQueryHandler(IAgentRepository agentRepository)
        => _agentRepository = agentRepository;

    public async Task<List<AgentDto>> Handle(GetAvailableAgentsQuery query, CancellationToken ct)
    {
        var agents = string.IsNullOrWhiteSpace(query.Region)
            ? await _agentRepository.GetByStatusAsync(AgentStatus.Available, ct)
            : await _agentRepository.GetByStatusAndRegionAsync(AgentStatus.Available, query.Region, ct);

        return agents.Select(a => new AgentDto(
            a.AgentId, a.FullName, a.Phone,
            a.Status.ToString(), a.CurrentOrderId,
            a.ServiceRegion, a.AverageRating, a.TotalDeliveries
        )).ToList();
    }
}
