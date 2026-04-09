namespace SupplyChain.Identity.Application.DTOs;

public record ShippingAddressDto(
    Guid    AddressId,
    string  Label,
    string  AddressLine1,
    string? District,
    string  City,
    string  State,
    string  PinCode,
    string? PhoneNumber,
    bool    IsDefault
);
