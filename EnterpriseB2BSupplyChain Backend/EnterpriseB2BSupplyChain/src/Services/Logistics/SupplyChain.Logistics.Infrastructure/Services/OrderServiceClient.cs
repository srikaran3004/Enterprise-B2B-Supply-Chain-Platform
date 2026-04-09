using System.Net.Http.Json;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class OrderServiceClient : IOrderServiceClient
{
    private readonly HttpClient _httpClient;

    public OrderServiceClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<OrderNotificationDetailsDto?> GetOrderNotificationDetailsAsync(Guid orderId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/internal/orders/{orderId}/notification-details", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            return await response.Content.ReadFromJsonAsync<OrderNotificationDetailsDto>(cancellationToken: ct);
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> AdvanceToReadyForDispatchAsync(Guid orderId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.PutAsync(
                $"/api/internal/orders/{orderId}/advance-to-dispatch", null, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
