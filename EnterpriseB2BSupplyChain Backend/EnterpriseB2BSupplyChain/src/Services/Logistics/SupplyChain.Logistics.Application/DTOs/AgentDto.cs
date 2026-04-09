namespace SupplyChain.Logistics.Application.DTOs;

public record AgentDto(
    Guid    AgentId,
    string  FullName,
    string  Phone,
    string  Status,
    Guid?   CurrentOrderId,
    string  ServiceRegion,
    decimal AverageRating,
    int     TotalDeliveries,
    string? LicenseNumber = null
);
