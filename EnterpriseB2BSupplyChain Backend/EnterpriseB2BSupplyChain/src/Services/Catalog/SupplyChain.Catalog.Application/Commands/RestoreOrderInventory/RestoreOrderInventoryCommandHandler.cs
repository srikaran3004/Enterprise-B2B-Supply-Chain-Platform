using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Exceptions;

namespace SupplyChain.Catalog.Application.Commands.RestoreOrderInventory;

public sealed class RestoreOrderInventoryCommandHandler : IRequestHandler<RestoreOrderInventoryCommand>
{
    private readonly IProductRepository _productRepository;

    public RestoreOrderInventoryCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task Handle(RestoreOrderInventoryCommand command, CancellationToken ct)
    {
        if (command.DealerId == Guid.Empty)
            throw new DomainException("INVALID_DEALER", "DealerId is required.");

        if (command.Lines is null || command.Lines.Count == 0)
            throw new DomainException("INVALID_LINES", "At least one order line is required.");

        var groupedLines = command.Lines
            .GroupBy(l => l.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();

        foreach (var line in groupedLines)
        {
            if (line.ProductId == Guid.Empty || line.Quantity <= 0)
                throw new DomainException("INVALID_LINE", "Order line has invalid product or quantity.");

            var product = await _productRepository.GetByIdAsync(line.ProductId, ct)
                ?? throw new KeyNotFoundException($"Product {line.ProductId} not found.");

            product.AddStock(line.Quantity);
        }

        await _productRepository.SaveChangesAsync(ct);
    }
}
