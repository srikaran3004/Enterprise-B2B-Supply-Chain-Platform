using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.ReleaseInventory;

public class ReleaseInventoryCommandHandler : IRequestHandler<ReleaseInventoryCommand, bool>
{
    private readonly IInventoryReservationService _reservationService;

    public ReleaseInventoryCommandHandler(IInventoryReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    public async Task<bool> Handle(ReleaseInventoryCommand request, CancellationToken ct)
    {
        if (request.ProductId.HasValue)
        {
            // Release specific product reservation
            await _reservationService.ReleaseReservationAsync(request.DealerId, request.ProductId.Value, ct);
        }
        else
        {
            // Release all reservations for dealer (clear cart)
            await _reservationService.ReleaseAllReservationsAsync(request.DealerId, ct);
        }

        return true;
    }
}
