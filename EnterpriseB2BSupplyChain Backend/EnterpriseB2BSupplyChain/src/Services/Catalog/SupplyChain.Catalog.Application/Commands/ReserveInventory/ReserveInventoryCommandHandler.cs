using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.ReserveInventory;

public class ReserveInventoryCommandHandler : IRequestHandler<ReserveInventoryCommand, ReserveInventoryResult>
{
    private readonly IInventoryReservationService _reservationService;
    private readonly IProductRepository _productRepo;

    public ReserveInventoryCommandHandler(
        IInventoryReservationService reservationService,
        IProductRepository productRepo)
    {
        _reservationService = reservationService;
        _productRepo = productRepo;
    }

    public async Task<ReserveInventoryResult> Handle(ReserveInventoryCommand request, CancellationToken ct)
    {
        // Validate product exists
        var product = await _productRepo.GetByIdAsync(request.ProductId, ct);
        if (product == null)
        {
            return new ReserveInventoryResult(false, "Product not found", 0);
        }

        if (product.Status != Domain.Enums.ProductStatus.Active)
        {
            return new ReserveInventoryResult(false, "Product is not available", 0);
        }

        // Check if inventory is available
        var isAvailable = await _reservationService.IsInventoryAvailableAsync(
            request.ProductId, 
            request.Quantity, 
            request.DealerId, 
            ct);

        if (!isAvailable)
        {
            var totalReserved = await _reservationService.GetTotalReservedQuantityAsync(request.ProductId, ct);
            var available = product.AvailableStock - totalReserved;
            return new ReserveInventoryResult(
                false, 
                $"Insufficient inventory. Only {available} units available.", 
                available);
        }

        // Reserve the inventory
        var success = await _reservationService.ReserveInventoryAsync(
            request.DealerId, 
            request.ProductId, 
            request.Quantity, 
            ct);

        if (success)
        {
            return new ReserveInventoryResult(true, "Inventory reserved successfully", request.Quantity);
        }

        return new ReserveInventoryResult(false, "Failed to reserve inventory", 0);
    }
}
