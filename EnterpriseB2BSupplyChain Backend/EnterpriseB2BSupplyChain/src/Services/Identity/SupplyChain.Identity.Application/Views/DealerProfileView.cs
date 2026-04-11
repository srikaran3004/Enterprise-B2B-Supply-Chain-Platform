using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Views;

public record DealerProfileView(
    Guid UserId,
    Guid? DealerProfileId,
    string Email,
    string FullName,
    string? PhoneNumber,
    string Status,
    string BusinessName,
    string GstNumber,
    string AddressLine1,
    string City,
    string State,
    string PinCode,
    DateTime CreatedAt,
    DateTime? ApprovedAt,
    Guid? ApprovedByAdminId
)
{
    public static DealerProfileView FromDto(DealerListDto dto) =>
        new(
            dto.UserId,
            dto.DealerProfileId,
            dto.Email,
            dto.FullName,
            dto.PhoneNumber,
            dto.Status,
            dto.BusinessName,
            dto.GstNumber,
            dto.AddressLine1,
            dto.City,
            dto.State,
            dto.PinCode,
            dto.CreatedAt,
            dto.ApprovedAt,
            dto.ApprovedByAdminId
        );
}
