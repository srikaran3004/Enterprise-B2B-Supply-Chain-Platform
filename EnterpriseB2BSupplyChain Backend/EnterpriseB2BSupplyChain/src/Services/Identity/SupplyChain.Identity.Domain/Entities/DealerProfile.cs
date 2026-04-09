using SupplyChain.Identity.Domain.Exceptions;

namespace SupplyChain.Identity.Domain.Entities;

public class DealerProfile
{
    public Guid DealerProfileId { get; private set; }
    public Guid UserId { get; private set; }
    public string BusinessName { get; private set; } = string.Empty;
    public string GstNumber { get; private set; } = string.Empty;
    public string AddressLine1 { get; private set; } = string.Empty;
    public string City { get; private set; } = string.Empty;
    public string State { get; private set; } = string.Empty;
    public string PinCode { get; private set; } = string.Empty;
    public bool IsInterstate { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public Guid? ApprovedByAdminId { get; private set; }

    // Navigation
    public User User { get; private set; } = null!;

    private DealerProfile() { }

    public static DealerProfile Create(
        Guid userId,
        string businessName,
        string gstNumber,
        string addressLine1,
        string city,
        string state,
        string pinCode,
        bool isInterstate)
    {
        if (string.IsNullOrWhiteSpace(businessName))
            throw new DomainException("INVALID_BUSINESS_NAME", "Business name is required.");

        if (string.IsNullOrWhiteSpace(gstNumber))
            throw new DomainException("INVALID_GST", "GST number is required.");

        return new DealerProfile
        {
            DealerProfileId = Guid.NewGuid(),
            UserId = userId,
            BusinessName = businessName.Trim(),
            GstNumber = gstNumber.Trim().ToUpperInvariant(),
            AddressLine1 = addressLine1.Trim(),
            City = city.Trim(),
            State = state.Trim(),
            PinCode = pinCode.Trim(),
            IsInterstate = isInterstate,
        };
    }

    public void MarkApproved(Guid adminId)
    {
        ApprovedAt = DateTime.UtcNow;
        ApprovedByAdminId = adminId;
    }
}
