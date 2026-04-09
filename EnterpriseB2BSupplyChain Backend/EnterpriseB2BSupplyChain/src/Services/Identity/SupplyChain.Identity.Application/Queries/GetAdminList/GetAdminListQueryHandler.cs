using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Queries.GetAdminList;

public class GetAdminListQueryHandler : IRequestHandler<GetAdminListQuery, List<AdminListDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICacheService _cache;

    public GetAdminListQueryHandler(IUserRepository userRepository, ICacheService cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    public async Task<List<AdminListDto>> Handle(GetAdminListQuery query, CancellationToken ct)
    {
        var cacheKey = "admins:all";
        var cachedAdmins = await _cache.GetAsync<List<AdminListDto>>(cacheKey, ct);
        if (cachedAdmins is not null)
            return cachedAdmins;

        var admins1 = await _userRepository.GetUsersByRoleAsync(UserRole.Admin, ct);
        var agents  = await _userRepository.GetUsersByRoleAsync(UserRole.DeliveryAgent, ct);
        var admins  = admins1.Concat(agents).ToList();

        var result = admins.Select(a => new AdminListDto(
            UserId: a.UserId,
            Email: a.Email,
            FullName: a.FullName,
            PhoneNumber: a.PhoneNumber,
            Role: a.Role.ToString(),
            Status: a.Status.ToString(),
            CreatedAt: a.CreatedAt
        )).ToList();

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10), ct);

        return result;
    }
}