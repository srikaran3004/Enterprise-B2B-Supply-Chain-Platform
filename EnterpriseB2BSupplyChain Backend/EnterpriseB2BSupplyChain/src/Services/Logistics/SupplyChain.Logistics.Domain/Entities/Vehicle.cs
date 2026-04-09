using SupplyChain.Logistics.Domain.Enums;
using SupplyChain.Logistics.Domain.Exceptions;

namespace SupplyChain.Logistics.Domain.Entities;

public class Vehicle
{
    public Guid          VehicleId      { get; private set; }
    public string        RegistrationNo { get; private set; } = string.Empty;
    public string        VehicleType    { get; private set; } = string.Empty;
    public decimal?      CapacityKg     { get; private set; }
    public VehicleStatus Status         { get; private set; }
    public Guid?         AssignedAgentId{ get; private set; }

    private Vehicle() { }

    public static Vehicle Create(
        string   registrationNo,
        string   vehicleType,
        decimal? capacityKg = null)
    {
        if (string.IsNullOrWhiteSpace(registrationNo))
            throw new DomainException("INVALID_REG", "Registration number is required.");

        return new Vehicle
        {
            VehicleId       = Guid.NewGuid(),
            RegistrationNo  = registrationNo.Trim().ToUpperInvariant(),
            VehicleType     = vehicleType.Trim(),
            CapacityKg      = capacityKg,
            Status          = VehicleStatus.Available
        };
    }

    public void AssignToAgent(Guid agentId)
    {
        if (Status != VehicleStatus.Available)
            throw new DomainException("VEHICLE_UNAVAILABLE", "Vehicle is not available.");

        Status          = VehicleStatus.InUse;
        AssignedAgentId = agentId;
    }

    public void Release()
    {
        Status          = VehicleStatus.Available;
        AssignedAgentId = null;
    }

    public void SendForMaintenance() => Status = VehicleStatus.Maintenance;
}
