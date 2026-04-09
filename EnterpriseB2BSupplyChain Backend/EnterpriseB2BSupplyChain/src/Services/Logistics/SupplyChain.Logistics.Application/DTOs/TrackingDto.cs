namespace SupplyChain.Logistics.Application.DTOs;

public record TrackingEventDto(
    string    Status,
    decimal?  Latitude,
    decimal?  Longitude,
    string?   Notes,
    string?   Place,
    DateTime  RecordedAt
);

public record TrackingDto(
    Guid                    OrderId,
    Guid                    ShipmentId,
    string                  CurrentStatus,
    decimal?                CurrentLatitude,
    decimal?                CurrentLongitude,
    DateTime                SlaDeadlineUtc,
    bool                    SlaAtRisk,
    int?                    CustomerRating,
    string?                 CustomerFeedback,
    List<TrackingEventDto>  History,
    string?                 AgentName              = null,
    string?                 AgentPhone             = null,
    string?                 VehicleRegistrationNo  = null,
    string?                 VehicleType            = null
);
