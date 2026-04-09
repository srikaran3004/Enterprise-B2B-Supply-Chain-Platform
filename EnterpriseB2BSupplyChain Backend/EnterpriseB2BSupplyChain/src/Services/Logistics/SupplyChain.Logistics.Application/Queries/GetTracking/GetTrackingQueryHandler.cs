using MediatR;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetTracking;

public class GetTrackingQueryHandler : IRequestHandler<GetTrackingQuery, TrackingDto?>
{
    private readonly IShipmentRepository  _shipmentRepository;
    private readonly ITrackingCacheService _cache;

    public GetTrackingQueryHandler(
        IShipmentRepository   shipmentRepository,
        ITrackingCacheService cache)
    {
        _shipmentRepository = shipmentRepository;
        _cache              = cache;
    }

    public async Task<TrackingDto?> Handle(GetTrackingQuery query, CancellationToken ct)
    {
        var shipment = await _shipmentRepository.GetByOrderIdAsync(query.OrderId, ct);

        // Shipment is created only after admin marks ReadyForDispatch.
        // Return null gracefully — the order is still being processed.
        if (shipment is null)
            return null;

        // Latest GPS from Redis (fast)
        var latest = await _cache.GetLatestLocationAsync(query.OrderId, ct);

        // Full history from DB
        var history = shipment.TrackingEvents
            .OrderBy(e => e.RecordedAt)
            .Select(e => new TrackingEventDto(
                e.Status, e.Latitude, e.Longitude, e.Notes, e.Place, e.RecordedAt))
            .ToList();

        return new TrackingDto(
            OrderId:                query.OrderId,
            ShipmentId:             shipment.ShipmentId,
            CurrentStatus:          latest?.Status ?? shipment.Status.ToString(),
            CurrentLatitude:        latest?.Latitude,
            CurrentLongitude:       latest?.Longitude,
            SlaDeadlineUtc:         shipment.SlaDeadlineUtc,
            SlaAtRisk:              shipment.IsSlaAtRisk(),
            CustomerRating:         shipment.CustomerRating,
            CustomerFeedback:       shipment.CustomerFeedback,
            History:                history,
            AgentName:              shipment.Agent?.FullName,
            AgentPhone:             shipment.Agent?.Phone,
            VehicleRegistrationNo:  shipment.Vehicle?.RegistrationNo,
            VehicleType:            shipment.Vehicle?.VehicleType
        );
    }
}
