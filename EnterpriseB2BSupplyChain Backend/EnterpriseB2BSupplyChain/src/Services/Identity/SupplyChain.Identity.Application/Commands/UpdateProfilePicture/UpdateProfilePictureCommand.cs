using MediatR;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Application.Commands.UpdateProfilePicture;

public record UpdateProfilePictureCommand(Guid UserId, string PictureUrl) : IRequest;

public class UpdateProfilePictureCommandHandler : IRequestHandler<UpdateProfilePictureCommand>
{
    private readonly IUserRepository _userRepository;

    public UpdateProfilePictureCommandHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task Handle(UpdateProfilePictureCommand request, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new KeyNotFoundException("User not found.");

        user.UpdateProfilePicture(request.PictureUrl);
        await _userRepository.SaveChangesAsync(ct);
    }
}
