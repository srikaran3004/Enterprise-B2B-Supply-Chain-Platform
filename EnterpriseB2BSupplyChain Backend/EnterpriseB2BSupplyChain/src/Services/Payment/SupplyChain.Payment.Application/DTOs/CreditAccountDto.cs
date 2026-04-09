namespace SupplyChain.Payment.Application.DTOs;

public record CreditAccountDto(
    Guid AccountId,
    Guid DealerId,
    decimal CreditLimit,
    decimal Outstanding,
    decimal Available,
    int Utilization,
    DateTime? LastUpdatedAt
);
