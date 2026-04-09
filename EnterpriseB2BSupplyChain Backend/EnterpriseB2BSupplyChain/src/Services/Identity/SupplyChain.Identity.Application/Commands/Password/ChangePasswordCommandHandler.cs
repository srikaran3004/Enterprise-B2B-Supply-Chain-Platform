using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Commands.Password;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, string>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(ChangePasswordCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.UserId, ct)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.Role != UserRole.Dealer)
            throw new UnauthorizedAccessException("Only dealer accounts are supported for this flow.");

        if (!_passwordHasher.Verify(command.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.UpdatePasswordHash(_passwordHasher.Hash(command.NewPassword));
        await _userRepository.SaveChangesAsync(ct);

        return "Password changed successfully.";
    }
}