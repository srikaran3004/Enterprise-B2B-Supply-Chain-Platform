using MediatR;

namespace SupplyChain.Logistics.Application.Commands.AssignAgent;

public record AssignAgentCommand(Guid OrderId, Guid AgentId, Guid VehicleId, DateTime? SlaDeadlineUtc = null) : IRequest<AssignAgentResult>;
public record AssignAgentResult(Guid ShipmentId, string AgentName, string AgentPhone, string VehicleRegNo);
