using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Queries.GetUserContact;

public record UserContactDto(
    Guid UserId,
    string Email,
    string FullName
);

public record GetUserContactQuery(Guid UserId) : IRequest<UserContactDto>;

public class GetUserContactQueryHandler : IRequestHandler<GetUserContactQuery, UserContactDto>
{
    private readonly IUserRepository _userRepository;

    public GetUserContactQueryHandler(IUserRepository userRepository)
        => _userRepository = userRepository;

    public async Task<UserContactDto> Handle(GetUserContactQuery query, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(query.UserId, ct)
            ?? throw new KeyNotFoundException($"User {query.UserId} not found.");

        return new UserContactDto(
            UserId: user.UserId,
            Email: user.Email,
            FullName: user.FullName
        );
    }
}
