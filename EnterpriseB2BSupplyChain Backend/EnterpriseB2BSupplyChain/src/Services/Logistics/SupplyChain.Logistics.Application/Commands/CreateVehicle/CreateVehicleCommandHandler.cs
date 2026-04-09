using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Application.Commands.CreateVehicle;

public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Guid>
{
    private readonly IAgentRepository _agentRepository;

    public CreateVehicleCommandHandler(IAgentRepository agentRepository)
        => _agentRepository = agentRepository;

    public async Task<Guid> Handle(CreateVehicleCommand command, CancellationToken ct)
    {
        var vehicle = Vehicle.Create(
            command.RegistrationNo,
            command.VehicleType,
            command.CapacityKg);

        await _agentRepository.AddVehicleAsync(vehicle, ct);
        await _agentRepository.SaveChangesAsync(ct);
        return vehicle.VehicleId;
    }
}
