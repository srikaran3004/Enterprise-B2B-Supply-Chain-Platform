namespace SupplyChain.Identity.Application.DTOs;

public record PendingDealerRegistrationPayload(
    string Email,
    string PasswordHash,
    string FullName,
    string? PhoneNumber,
    string BusinessName,
    string GstNumber,
    string AddressLine1,
    string City,
    string State,
    string PinCode,
    bool IsInterstate
);