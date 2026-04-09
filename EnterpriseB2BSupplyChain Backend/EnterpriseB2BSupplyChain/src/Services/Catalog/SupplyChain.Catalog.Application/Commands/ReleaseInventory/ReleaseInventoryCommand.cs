using MediatR;

namespace SupplyChain.Catalog.Application.Commands.ReleaseInventory;

public record ReleaseInventoryCommand(
    Guid DealerId,
    Guid? ProductId = null  // If null, release all reservations for dealer
) : IRequest<bool>;
