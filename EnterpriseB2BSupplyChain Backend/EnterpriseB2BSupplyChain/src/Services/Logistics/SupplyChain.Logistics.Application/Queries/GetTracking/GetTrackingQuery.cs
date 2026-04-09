using MediatR;
using SupplyChain.Logistics.Application.DTOs;

namespace SupplyChain.Logistics.Application.Queries.GetTracking;

public record GetTrackingQuery(Guid OrderId) : IRequest<TrackingDto?>;
