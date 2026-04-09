using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Queries.GetDealerContact;

public record DealerContactDto(
    Guid DealerId,
    string Email,
    string FullName
);

public record GetDealerContactQuery(Guid DealerId) : IRequest<DealerContactDto>;

public class GetDealerContactQueryHandler : IRequestHandler<GetDealerContactQuery, DealerContactDto>
{
    private readonly IUserRepository _userRepository;

    public GetDealerContactQueryHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task<DealerContactDto> Handle(GetDealerContactQuery query, CancellationToken ct)
    {
        var user = await _userRepository.GetDealerByProfileIdAsync(query.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {query.DealerId} not found.");

        return new DealerContactDto(
            DealerId: query.DealerId,
            Email: user.Email,
            FullName: user.FullName);
    }
}
