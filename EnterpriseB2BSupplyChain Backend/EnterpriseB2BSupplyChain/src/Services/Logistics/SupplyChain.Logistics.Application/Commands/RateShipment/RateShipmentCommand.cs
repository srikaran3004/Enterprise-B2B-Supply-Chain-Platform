using MediatR;

namespace SupplyChain.Logistics.Application.Commands.RateShipment;

public record RateShipmentCommand(
    Guid   ShipmentId,
    int    Rating,
    string? Feedback
) : IRequest<RateShipmentResult>;

public record RateShipmentResult(
    Guid    ShipmentId,
    int     Rating,
    string? Feedback,
    decimal AgentAverageRating,
    int     AgentTotalDeliveries
);
