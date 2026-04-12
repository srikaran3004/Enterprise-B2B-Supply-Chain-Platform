using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Queries.GetAdminList;

public class GetAdminListQueryHandler : IRequestHandler<GetAdminListQuery, List<AdminListDto>>
{
    private readonly IUserRepository _userRepository;

    public GetAdminListQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<AdminListDto>> Handle(GetAdminListQuery query, CancellationToken ct)
    {
        var admins = await _userRepository.GetUsersByRolesAsync(
            [UserRole.Admin, UserRole.DeliveryAgent],
            ct
        );

        var result = admins.Select(a => new AdminListDto(
            UserId: a.UserId,
            Email: a.Email,
            FullName: a.FullName,
            PhoneNumber: a.PhoneNumber,
            Role: a.Role.ToString(),
            Status: a.Status.ToString(),
            CreatedAt: a.CreatedAt
        )).ToList();

        return result;
    }
}