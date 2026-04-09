using MediatR;

namespace SupplyChain.Catalog.Application.Commands.ReserveInventory;

public record ReserveInventoryCommand(
    Guid DealerId,
    Guid ProductId,
    int Quantity
) : IRequest<ReserveInventoryResult>;

public record ReserveInventoryResult(
    bool Success,
    string? Message,
    int AvailableQuantity
);
