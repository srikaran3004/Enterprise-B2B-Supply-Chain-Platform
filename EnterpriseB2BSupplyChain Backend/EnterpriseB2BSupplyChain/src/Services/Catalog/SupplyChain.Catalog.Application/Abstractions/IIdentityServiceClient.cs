namespace SupplyChain.Catalog.Application.Abstractions;

public interface IIdentityServiceClient
{
    Task<DealerContactDto?> GetDealerContactAsync(Guid dealerId, CancellationToken ct);
}

public record DealerContactDto(
    Guid DealerId,
    string Email,
    string FullName
);
