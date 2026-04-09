using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Application.Commands.ShippingAddress;

// ── Add ──────────────────────────────────────────────────────────────────────

public record AddShippingAddressCommand(
    Guid    DealerId,
    string  Label,
    string  AddressLine1,
    string? District,
    string  City,
    string  State,
    string  PinCode,
    string? PhoneNumber,
    bool    IsDefault
) : IRequest<Guid>;

public class AddShippingAddressCommandHandler : IRequestHandler<AddShippingAddressCommand, Guid>
{
    private readonly IShippingAddressRepository _repo;

    public AddShippingAddressCommandHandler(IShippingAddressRepository repo)
        => _repo = repo;

    public async Task<Guid> Handle(AddShippingAddressCommand cmd, CancellationToken ct)
    {
        // If setting as default, unset all existing defaults first
        if (cmd.IsDefault)
        {
            var existing = await _repo.GetByDealerIdAsync(cmd.DealerId, ct);
            foreach (var addr in existing.Where(a => a.IsDefault))
                addr.UnsetDefault();
        }

        var address = Domain.Entities.ShippingAddress.Create(
            cmd.DealerId, cmd.Label, cmd.AddressLine1,
            cmd.City, cmd.State, cmd.PinCode, cmd.PhoneNumber, cmd.IsDefault,
            cmd.District);

        await _repo.AddAsync(address, ct);
        await _repo.SaveChangesAsync(ct);

        return address.AddressId;
    }
}

// ── Update ───────────────────────────────────────────────────────────────────

public record UpdateShippingAddressCommand(
    Guid    AddressId,
    Guid    DealerId,
    string  Label,
    string  AddressLine1,
    string? District,
    string  City,
    string  State,
    string  PinCode,
    string? PhoneNumber
) : IRequest;

public class UpdateShippingAddressCommandHandler : IRequestHandler<UpdateShippingAddressCommand>
{
    private readonly IShippingAddressRepository _repo;

    public UpdateShippingAddressCommandHandler(IShippingAddressRepository repo)
        => _repo = repo;

    public async Task Handle(UpdateShippingAddressCommand cmd, CancellationToken ct)
    {
        var address = await _repo.GetByIdAsync(cmd.AddressId, ct)
            ?? throw new KeyNotFoundException("Address not found.");

        if (address.DealerId != cmd.DealerId)
            throw new UnauthorizedAccessException("Address does not belong to this dealer.");

        address.Update(cmd.Label, cmd.AddressLine1, cmd.City, cmd.State, cmd.PinCode, cmd.PhoneNumber, cmd.District);
        await _repo.SaveChangesAsync(ct);
    }
}

// ── Delete ───────────────────────────────────────────────────────────────────

public record DeleteShippingAddressCommand(Guid AddressId, Guid DealerId) : IRequest;

public class DeleteShippingAddressCommandHandler : IRequestHandler<DeleteShippingAddressCommand>
{
    private readonly IShippingAddressRepository _repo;

    public DeleteShippingAddressCommandHandler(IShippingAddressRepository repo)
        => _repo = repo;

    public async Task Handle(DeleteShippingAddressCommand cmd, CancellationToken ct)
    {
        var address = await _repo.GetByIdAsync(cmd.AddressId, ct)
            ?? throw new KeyNotFoundException("Address not found.");

        if (address.DealerId != cmd.DealerId)
            throw new UnauthorizedAccessException("Address does not belong to this dealer.");

        await _repo.RemoveAsync(address, ct);
        await _repo.SaveChangesAsync(ct);
    }
}

// ── Set Default ──────────────────────────────────────────────────────────────

public record SetDefaultAddressCommand(Guid AddressId, Guid DealerId) : IRequest;

public class SetDefaultAddressCommandHandler : IRequestHandler<SetDefaultAddressCommand>
{
    private readonly IShippingAddressRepository _repo;

    public SetDefaultAddressCommandHandler(IShippingAddressRepository repo)
        => _repo = repo;

    public async Task Handle(SetDefaultAddressCommand cmd, CancellationToken ct)
    {
        var all = await _repo.GetByDealerIdAsync(cmd.DealerId, ct);
        foreach (var addr in all.Where(a => a.IsDefault))
            addr.UnsetDefault();

        var target = all.FirstOrDefault(a => a.AddressId == cmd.AddressId)
            ?? throw new KeyNotFoundException("Address not found.");

        if (target.DealerId != cmd.DealerId)
            throw new UnauthorizedAccessException("Address does not belong to this dealer.");

        target.SetAsDefault();
        await _repo.SaveChangesAsync(ct);
    }
}
