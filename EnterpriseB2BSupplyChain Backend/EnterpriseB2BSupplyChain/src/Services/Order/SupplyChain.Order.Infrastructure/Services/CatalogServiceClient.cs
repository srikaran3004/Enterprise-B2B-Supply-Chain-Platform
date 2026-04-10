using System.Net.Http.Json;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.Infrastructure.Services;

public sealed class CatalogServiceClient : IInventoryServiceClient
{
    private readonly HttpClient _httpClient;

    public CatalogServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public Task<bool> CommitOrderInventoryAsync(
        Guid dealerId,
        IReadOnlyCollection<InventoryOrderLine> lines,
        CancellationToken ct = default)
        => PostInventoryAsync("/api/inventory/internal/commit-order", dealerId, lines, ct);

    public Task<bool> RestoreOrderInventoryAsync(
        Guid dealerId,
        IReadOnlyCollection<InventoryOrderLine> lines,
        CancellationToken ct = default)
        => PostInventoryAsync("/api/inventory/internal/restore-order", dealerId, lines, ct);

    private async Task<bool> PostInventoryAsync(
        string url,
        Guid dealerId,
        IReadOnlyCollection<InventoryOrderLine> lines,
        CancellationToken ct)
    {
        try
        {
            var payload = new
            {
                dealerId,
                lines = lines.Select(l => new { l.ProductId, l.Quantity })
            };

            var response = await _httpClient.PostAsJsonAsync(url, payload, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
