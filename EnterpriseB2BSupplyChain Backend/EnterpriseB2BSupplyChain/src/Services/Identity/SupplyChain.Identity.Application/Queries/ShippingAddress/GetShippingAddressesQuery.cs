using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Queries.ShippingAddress;

public record GetShippingAddressesQuery(Guid DealerId) : IRequest<List<ShippingAddressDto>>;

public class GetShippingAddressesQueryHandler : IRequestHandler<GetShippingAddressesQuery, List<ShippingAddressDto>>
{
    private readonly IShippingAddressRepository _repo;

    public GetShippingAddressesQueryHandler(IShippingAddressRepository repo)
        => _repo = repo;

    public async Task<List<ShippingAddressDto>> Handle(GetShippingAddressesQuery request, CancellationToken ct)
    {
        var addresses = await _repo.GetByDealerIdAsync(request.DealerId, ct);

        return addresses.Select(a => new ShippingAddressDto(
            a.AddressId,
            a.Label,
            a.AddressLine1,
            a.District,
            a.City,
            a.State,
            a.PinCode,
            a.PhoneNumber,
            a.IsDefault
        )).ToList();
    }
}
