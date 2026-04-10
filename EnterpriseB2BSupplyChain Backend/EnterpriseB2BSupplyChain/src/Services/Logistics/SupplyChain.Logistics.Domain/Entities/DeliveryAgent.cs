using SupplyChain.Logistics.Domain.Enums;
using SupplyChain.Logistics.Domain.Exceptions;

namespace SupplyChain.Logistics.Domain.Entities;

public class DeliveryAgent
{
    public Guid        AgentId         { get; private set; }
    public Guid        UserId          { get; private set; }
    public string      FullName        { get; private set; } = string.Empty;
    public string      Phone           { get; private set; } = string.Empty;
    public string?     LicenseNumber   { get; private set; }
    public string      ServiceRegion   { get; private set; } = string.Empty;
    public int         TotalDeliveries { get; private set; }
    public decimal     AverageRating   { get; private set; }
    public AgentStatus Status          { get; private set; }
    public Guid?       CurrentOrderId  { get; private set; }
    public DateTime    CreatedAt       { get; private set; }

    private DeliveryAgent() { }

    public static DeliveryAgent Create(
        Guid   userId,
        string fullName,
        string phone,
        string? licenseNumber = null,
        string? serviceRegion = null)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("INVALID_NAME", "Agent name is required.");

        if (string.IsNullOrWhiteSpace(phone))
            throw new DomainException("INVALID_PHONE", "Phone number is required.");

        return new DeliveryAgent
        {
            AgentId         = Guid.NewGuid(),
            UserId          = userId,
            FullName        = fullName.Trim(),
            Phone           = phone.Trim(),
            LicenseNumber   = licenseNumber?.Trim(),
            ServiceRegion   = serviceRegion?.Trim() ?? string.Empty,
            TotalDeliveries = 0,
            AverageRating   = 0.0m,
            Status          = AgentStatus.Available,
            CreatedAt       = DateTime.UtcNow
        };
    }

    public void AssignToOrder(Guid orderId)
    {
        if (Status != AgentStatus.Available)
            throw new DomainException("AGENT_UNAVAILABLE", $"Agent {FullName} is not available.");

        Status         = AgentStatus.Assigned;
        CurrentOrderId = orderId;
    }

    public void CompleteDelivery()
    {
        Status         = AgentStatus.Available;
        CurrentOrderId = null;
    }

    public void RecordDeliveryRating(int rating)
    {
        if (rating < 1 || rating > 5)
            throw new DomainException("INVALID_RATING", "Rating must be between 1 and 5.");

        var totalScore = AverageRating * TotalDeliveries + rating;
        TotalDeliveries++;
        AverageRating = Math.Round(totalScore / TotalDeliveries, 2);
    }

    public void LinkToUser(Guid userId)
    {
        if (userId == Guid.Empty)
            throw new DomainException("INVALID_USER_ID", "UserId is required.");

        UserId = userId;
    }

    public void SetOffDuty()  => Status = AgentStatus.OffDuty;
    public void SetAvailable() => Status = AgentStatus.Available;
}
