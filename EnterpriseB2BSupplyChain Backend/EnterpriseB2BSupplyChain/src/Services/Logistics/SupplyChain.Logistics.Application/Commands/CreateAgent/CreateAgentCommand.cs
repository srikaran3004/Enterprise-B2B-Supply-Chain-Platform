using MediatR;

namespace SupplyChain.Logistics.Application.Commands.CreateAgent;

public record CreateAgentCommand(
    Guid    UserId,
    string  FullName,
    string  Phone,
    string? LicenseNumber,
    string? ServiceRegion
) : IRequest<Guid>;
