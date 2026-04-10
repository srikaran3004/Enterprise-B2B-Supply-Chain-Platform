using MediatR;

namespace SupplyChain.Catalog.Application.Commands.CommitOrderInventory;

public record CommitOrderInventoryLine(Guid ProductId, int Quantity);

public record CommitOrderInventoryCommand(
    Guid DealerId,
    IReadOnlyCollection<CommitOrderInventoryLine> Lines
) : IRequest;
