using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.Payment.Infrastructure.Services;

public interface IOrderInternalClient
{
    Task<OrderInvoiceDetailsDto?> GetInvoiceDetailsAsync(Guid orderId, CancellationToken ct);
}

public sealed record OrderInvoiceLineDto(
    Guid ProductId,
    string ProductName,
    string SKU,
    int Quantity,
    decimal UnitPrice
);

public sealed record OrderInvoiceDetailsDto(
    Guid OrderId,
    Guid DealerId,
    string? DealerEmail,
    string? DealerName,
    decimal TotalAmount,
    string PaymentMode,
    string? ShippingState,
    List<OrderInvoiceLineDto> Lines
);

public class OrderInternalClient : IOrderInternalClient
{
    private readonly HttpClient _httpClient;

    public OrderInternalClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<OrderInvoiceDetailsDto?> GetInvoiceDetailsAsync(Guid orderId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/internal/orders/{orderId}/invoice-details", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            return await ApiResponseReader.ReadDataAsync<OrderInvoiceDetailsDto>(response.Content, ct);
        }
        catch
        {
            return null;
        }
    }
}
