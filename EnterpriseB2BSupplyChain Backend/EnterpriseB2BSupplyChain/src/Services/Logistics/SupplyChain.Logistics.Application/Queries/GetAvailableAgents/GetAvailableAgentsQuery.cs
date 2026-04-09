using MediatR;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetAvailableAgents;

public record GetAvailableAgentsQuery(string? Region = null) : IRequest<List<AgentDto>>;
