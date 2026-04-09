namespace SupplyChain.Logistics.Domain.Entities;

public class TrackingEvent
{
    public Guid      EventId           { get; private set; }
    public Guid      ShipmentId        { get; private set; }
    public string    Status            { get; private set; } = string.Empty;
    public decimal?  Latitude          { get; private set; }
    public decimal?  Longitude         { get; private set; }
    public string?   Notes             { get; private set; }
    /// <summary>Human-readable place/location text (e.g. "Reached Pune", "Near Nagpur highway").</summary>
    public string?   Place             { get; private set; }
    public DateTime  RecordedAt        { get; private set; }
    public Guid?     RecordedByAgentId { get; private set; }

    public Shipment Shipment { get; private set; } = null!;

    private TrackingEvent() { }

    public static TrackingEvent Create(
        Guid     shipmentId,
        string   status,
        decimal? latitude          = null,
        decimal? longitude         = null,
        string?  notes             = null,
        Guid?    recordedByAgentId = null,
        string?  place             = null)
        => new()
        {
            EventId           = Guid.NewGuid(),
            ShipmentId        = shipmentId,
            Status            = status,
            Latitude          = latitude,
            Longitude         = longitude,
            Notes             = notes,
            Place             = place,
            RecordedAt        = DateTime.UtcNow,
            RecordedByAgentId = recordedByAgentId
        };
}
