namespace SupplyChain.Order.Application.Abstractions;

public interface IIdentityServiceClient
{
    Task<ShippingAddressDto?> GetShippingAddressAsync(Guid dealerId, Guid? addressId, CancellationToken ct);
    Task<DealerContactDto?> GetDealerContactAsync(Guid dealerId, CancellationToken ct);
}

public record ShippingAddressDto(
    Guid AddressId,
    string Label,
    string AddressLine1,
    string? District,
    string City,
    string State,
    string PinCode,
    string? PhoneNumber,
    bool IsDefault
);

public record DealerContactDto(
    Guid DealerId,
    string Email,
    string FullName
);
