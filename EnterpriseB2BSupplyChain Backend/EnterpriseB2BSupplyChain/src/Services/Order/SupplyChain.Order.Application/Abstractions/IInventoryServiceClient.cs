namespace SupplyChain.Order.Application.Abstractions;

public record InventoryOrderLine(Guid ProductId, int Quantity);

public interface IInventoryServiceClient
{
    Task<bool> CommitOrderInventoryAsync(
        Guid dealerId,
        IReadOnlyCollection<InventoryOrderLine> lines,
        CancellationToken ct = default);

    Task<bool> RestoreOrderInventoryAsync(
        Guid dealerId,
        IReadOnlyCollection<InventoryOrderLine> lines,
        CancellationToken ct = default);
}
