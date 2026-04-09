namespace SupplyChain.Identity.Application.DTOs;

public record AdminListDto(
    Guid UserId,
    string Email,
    string FullName,
    string? PhoneNumber,
    string Role,
    string Status,
    DateTime CreatedAt
);