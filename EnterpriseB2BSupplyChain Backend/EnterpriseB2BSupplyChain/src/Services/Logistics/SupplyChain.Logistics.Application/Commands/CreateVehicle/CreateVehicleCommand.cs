using MediatR;

namespace SupplyChain.Logistics.Application.Commands.CreateVehicle;

public record CreateVehicleCommand(
    string   RegistrationNo,
    string   VehicleType,
    decimal? CapacityKg
) : IRequest<Guid>;
