using MediatR;
using SupplyChain.Catalog.Application.Commands.CommitOrderInventory;

namespace SupplyChain.Catalog.Application.Commands.RestoreOrderInventory;

public record RestoreOrderInventoryCommand(
    Guid DealerId,
    IReadOnlyCollection<CommitOrderInventoryLine> Lines
) : IRequest;
