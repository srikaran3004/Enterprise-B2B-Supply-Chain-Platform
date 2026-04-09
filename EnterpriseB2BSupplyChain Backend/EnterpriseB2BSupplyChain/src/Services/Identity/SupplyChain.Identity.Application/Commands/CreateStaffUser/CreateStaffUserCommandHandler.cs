using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.CreateStaffUser;

public class CreateStaffUserCommandHandler : IRequestHandler<CreateStaffUserCommand, Guid>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICacheService _cacheService;

    public CreateStaffUserCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ICacheService cacheService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _cacheService = cacheService;
    }

    public async Task<Guid> Handle(CreateStaffUserCommand command, CancellationToken ct)
    {
        if (await _userRepository.EmailExistsAsync(command.Email, ct))
            throw new InvalidOperationException($"Email '{command.Email}' is already registered.");

        if (!Enum.TryParse<UserRole>(command.Role, true, out var role))
            throw new InvalidOperationException("Invalid role.");

        if (role is UserRole.Dealer or UserRole.SuperAdmin)
            throw new InvalidOperationException("Only staff roles can be created from this endpoint.");

        var passwordHash = _passwordHasher.Hash(command.Password);
        var user = User.CreateStaff(command.Email, passwordHash, command.FullName, role);

        await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        await _cacheService.RemoveAsync("admins:all", ct);

        return user.UserId;
    }
}
