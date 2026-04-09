namespace SupplyChain.Logistics.Application.Abstractions;

public interface IIdentityServiceClient
{
    Task<DealerContactDto?> GetDealerContactAsync(Guid dealerId, CancellationToken ct);
    Task<UserContactDto?> GetUserContactAsync(Guid userId, CancellationToken ct);
}

public record DealerContactDto(
    Guid DealerId,
    string Email,
    string FullName
);

public record UserContactDto(
    Guid UserId,
    string Email,
    string FullName
);
