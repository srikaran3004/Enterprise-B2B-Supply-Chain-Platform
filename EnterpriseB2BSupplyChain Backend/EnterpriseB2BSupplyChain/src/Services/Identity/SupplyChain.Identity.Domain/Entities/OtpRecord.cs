using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Domain.Entities;

public class OtpRecord
{
    public Guid OtpId { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public OtpPurpose Purpose { get; private set; }
    public string OtpHash { get; private set; } = string.Empty;
    public string? PayloadJson { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public bool IsUsed { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private OtpRecord() { }

    public static OtpRecord Create(
        string email,
        OtpPurpose purpose,
        string otpHash,
        string? payloadJson = null,
        int expiryMinutes = 15)
    {
        return new OtpRecord
        {
            OtpId = Guid.NewGuid(),
            Email = email.Trim().ToLowerInvariant(),
            Purpose = purpose,
            OtpHash = otpHash,
            PayloadJson = payloadJson,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    public bool IsValid() => !IsUsed && ExpiresAt > DateTime.UtcNow;

    public void MarkUsed() => IsUsed = true;
}