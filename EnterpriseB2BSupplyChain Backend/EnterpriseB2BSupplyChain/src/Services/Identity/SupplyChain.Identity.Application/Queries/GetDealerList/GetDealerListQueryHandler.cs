using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Queries.GetDealerList;

public class GetDealerListQueryHandler : IRequestHandler<GetDealerListQuery, List<DealerListDto>>
{
    private readonly IUserRepository _userRepository;

    public GetDealerListQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<DealerListDto>> Handle(GetDealerListQuery query, CancellationToken ct)
    {
        var users = await _userRepository.GetDealersByStatusAsync(query.Status, ct);

        var result = users.Select(u => new DealerListDto(
            UserId: u.UserId,
            DealerProfileId: u.DealerProfile?.DealerProfileId,
            Email: u.Email,
            FullName: u.FullName,
            PhoneNumber: u.PhoneNumber,
            Status: u.Status.ToString(),
            BusinessName: u.DealerProfile?.BusinessName ?? "—",
            GstNumber: u.DealerProfile?.GstNumber ?? "—",
            AddressLine1: u.DealerProfile?.AddressLine1 ?? "—",
            City: u.DealerProfile?.City ?? "—",
            State: u.DealerProfile?.State ?? "—",
            PinCode: u.DealerProfile?.PinCode ?? "—",
            CreatedAt: u.CreatedAt,
            ApprovedAt: u.DealerProfile?.ApprovedAt,
            ApprovedByAdminId: u.DealerProfile?.ApprovedByAdminId
        )).ToList();

        return result;
    }
}
