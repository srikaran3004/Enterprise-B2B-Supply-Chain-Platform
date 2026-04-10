using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Results;

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

            return await ApiResponseReader.ReadDataAsync<OrderNotificationDetailsDto>(response.Content, ct);
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

    public async Task<bool> MarkInTransitAsync(Guid orderId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.PutAsync(
                $"/api/internal/orders/{orderId}/mark-in-transit", null, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> MarkDeliveredAsync(Guid orderId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.PutAsync(
                $"/api/internal/orders/{orderId}/mark-delivered", null, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
