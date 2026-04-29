using SupplyChain.Logistics.Domain.Enums;
using SupplyChain.Logistics.Domain.Exceptions;

namespace SupplyChain.Logistics.Domain.Entities;

public class Shipment
{
    public Guid            ShipmentId          { get; private set; }
    public Guid            OrderId             { get; private set; }
    public Guid            DealerId            { get; private set; }  // Stored for IDOR checks without cross-service calls
    public Guid?           AgentId             { get; private set; }
    public Guid?           VehicleId           { get; private set; }
    public ShipmentStatus  Status              { get; private set; }
    public DateTime        SlaDeadlineUtc      { get; private set; }
    public bool            SlaAtRiskNotified   { get; private set; }
    public DateTime?       PickedUpAt          { get; private set; }
    public DateTime?       DeliveredAt         { get; private set; }
    public int?            CustomerRating      { get; private set; }
    public string?         CustomerFeedback    { get; private set; }
    public DateTime        CreatedAt           { get; private set; }

    // Navigation
    public DeliveryAgent?          Agent          { get; private set; }
    public Vehicle?                Vehicle        { get; private set; }
    public ICollection<TrackingEvent> TrackingEvents { get; private set; } = new List<TrackingEvent>();

    private Shipment() { }

    public static Shipment Create(Guid orderId, Guid dealerId, DateTime slaDeadlineUtc)
        => new()
        {
            ShipmentId        = Guid.NewGuid(),
            OrderId           = orderId,
            DealerId          = dealerId,
            Status            = ShipmentStatus.Pending,
            SlaDeadlineUtc    = slaDeadlineUtc,
            SlaAtRiskNotified = false,
            CreatedAt         = DateTime.UtcNow
        };

    public void AssignAgent(Guid agentId, Guid vehicleId)
    {
        if (Status != ShipmentStatus.Pending)
            throw new DomainException("INVALID_STATUS", "Can only assign agent to Pending shipments.");

        AgentId   = agentId;
        VehicleId = vehicleId;
        Status    = ShipmentStatus.AgentAssigned;

        TrackingEvents.Add(TrackingEvent.Create(
            ShipmentId, "AgentAssigned",
            notes: "Delivery agent assigned"));
    }

    public void MarkPickedUp(Guid agentId, decimal? lat = null, decimal? lng = null)
    {
        if (Status != ShipmentStatus.AgentAssigned)
            throw new DomainException("INVALID_STATUS", "Agent must be assigned before pickup.");

        Status     = ShipmentStatus.PickedUp;
        PickedUpAt = DateTime.UtcNow;

        TrackingEvents.Add(TrackingEvent.Create(
            ShipmentId, "PickedUp", lat, lng,
            "Goods picked up from warehouse", agentId));
    }

    public void UpdateStatus(
        ShipmentStatus newStatus,
        Guid           agentId,
        decimal?       lat   = null,
        decimal?       lng   = null,
        string?        notes = null,
        string?        place = null)
    {
        Status = newStatus;
        TrackingEvents.Add(TrackingEvent.Create(
            ShipmentId, newStatus.ToString(), lat, lng, notes, agentId, place));
    }

    public void MarkDelivered(Guid agentId, decimal? lat = null, decimal? lng = null)
    {
        Status      = ShipmentStatus.Delivered;
        DeliveredAt = DateTime.UtcNow;

        TrackingEvents.Add(TrackingEvent.Create(
            ShipmentId, "Delivered", lat, lng,
            "Order delivered successfully", agentId));
    }

    public void RateDelivery(int rating, string? feedback)
    {
        if (Status != ShipmentStatus.Delivered)
            throw new DomainException("NOT_DELIVERED", "Only delivered shipments can be rated.");

        if (CustomerRating is not null)
            throw new DomainException("ALREADY_RATED", "This shipment has already been rated.");

        if (rating < 1 || rating > 5)
            throw new DomainException("INVALID_RATING", "Rating must be between 1 and 5.");

        CustomerRating   = rating;
        CustomerFeedback = feedback;
    }

    public void MarkSlaAtRisk() => SlaAtRiskNotified = true;

    public bool IsSlaAtRisk()
    {
        if (Status == ShipmentStatus.Delivered) return false;
        var remaining   = SlaDeadlineUtc - DateTime.UtcNow;
        var totalWindow = SlaDeadlineUtc - CreatedAt;
        if (totalWindow.TotalSeconds <= 0) return false;
        return remaining.TotalSeconds / totalWindow.TotalSeconds < 0.20;
    }
}
