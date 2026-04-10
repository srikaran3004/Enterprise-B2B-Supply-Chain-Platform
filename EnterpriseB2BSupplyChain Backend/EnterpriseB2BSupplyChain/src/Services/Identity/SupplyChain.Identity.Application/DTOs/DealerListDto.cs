namespace SupplyChain.Identity.Application.DTOs;

public record DealerListDto(
    Guid UserId,
    Guid? DealerProfileId,
    string Email,
    string FullName,
    string? PhoneNumber,
    string Status,
    string BusinessName,
    string GstNumber,
    string City,
    string State,
    DateTime CreatedAt,
    DateTime? ApprovedAt,
    Guid? ApprovedByAdminId
);
