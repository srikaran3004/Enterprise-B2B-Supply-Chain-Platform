using MediatR;
using Microsoft.Extensions.Logging;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Exceptions;

namespace SupplyChain.Catalog.Application.Commands.CommitOrderInventory;

public sealed class CommitOrderInventoryCommandHandler : IRequestHandler<CommitOrderInventoryCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly IInventoryReservationService _reservationService;
    private readonly ILogger<CommitOrderInventoryCommandHandler> _logger;

    public CommitOrderInventoryCommandHandler(
        IProductRepository productRepository,
        IInventoryReservationService reservationService,
        ILogger<CommitOrderInventoryCommandHandler> logger)
    {
        _productRepository = productRepository;
        _reservationService = reservationService;
        _logger = logger;
    }

    public async Task Handle(CommitOrderInventoryCommand command, CancellationToken ct)
    {
        if (command.DealerId == Guid.Empty)
            throw new DomainException("INVALID_DEALER", "DealerId is required.");

        if (command.Lines is null || command.Lines.Count == 0)
            throw new DomainException("INVALID_LINES", "At least one order line is required.");

        var groupedLines = command.Lines
            .GroupBy(l => l.ProductId)
            .Select(g => new CommitOrderInventoryLine(g.Key, g.Sum(x => x.Quantity)))
            .ToList();

        foreach (var line in groupedLines)
        {
            if (line.ProductId == Guid.Empty || line.Quantity <= 0)
                throw new DomainException("INVALID_LINE", "Order line has invalid product or quantity.");

            var product = await _productRepository.GetByIdAsync(line.ProductId, ct)
                ?? throw new KeyNotFoundException($"Product {line.ProductId} not found.");

            var availableForOrder = await _reservationService.IsInventoryAvailableAsync(
                line.ProductId,
                line.Quantity,
                command.DealerId,
                ct);

            if (!availableForOrder)
            {
                throw new DomainException(
                    "INSUFFICIENT_STOCK",
                    $"Insufficient stock for product {product.Name} (SKU: {product.SKU}).");
            }

            product.HardDeductStock(line.Quantity);
        }

        await _productRepository.SaveChangesAsync(ct);

        foreach (var line in groupedLines)
        {
            try
            {
                await _reservationService.ReleaseReservationAsync(command.DealerId, line.ProductId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Inventory committed but reservation release failed for DealerId={DealerId}, ProductId={ProductId}",
                    command.DealerId,
                    line.ProductId);
            }
        }
    }
}
