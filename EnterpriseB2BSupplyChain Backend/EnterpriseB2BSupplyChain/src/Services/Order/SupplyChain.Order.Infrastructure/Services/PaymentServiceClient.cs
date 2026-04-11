using System.Net.Http.Json;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.Order.Infrastructure.Services;

public class PaymentServiceClient : IPaymentServiceClient
{
    private readonly HttpClient _httpClient;

    public PaymentServiceClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<CreditCheckResult> CheckCreditAsync(
        Guid dealerId,
        decimal amount,
        CancellationToken ct = default)
    {
        try
        {
            var url = $"/api/payment/internal/dealers/{dealerId}/credit-check?amount={amount}";
            var response = await _httpClient.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                return new CreditCheckResult(false, 0);
            }

            var result = await ApiResponseReader.ReadDataAsync<CreditCheckResponse>(response.Content, ct);

            return new CreditCheckResult(result?.Approved ?? false, result?.AvailableCredit ?? 0);
        }
        catch
        {
            return new CreditCheckResult(false, 0);
        }
    }

    public async Task<bool> ReserveCreditAsync(Guid orderId, Guid dealerId, decimal amount, CancellationToken ct = default)
    {
        try
        {
            var url = $"/api/payment/internal/orders/{orderId}/reserve-credit";
            var response = await _httpClient.PostAsJsonAsync(url, new { dealerId, amount }, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> ReleaseCreditAsync(Guid orderId, Guid dealerId, decimal amount, CancellationToken ct = default)
    {
        try
        {
            var url = $"/api/payment/internal/orders/{orderId}/release-credit";
            var response = await _httpClient.PostAsJsonAsync(url, new { dealerId, amount }, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private record CreditCheckResponse(bool Approved, decimal AvailableCredit);
}
