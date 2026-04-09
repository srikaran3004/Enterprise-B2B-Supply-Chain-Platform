using System.Text.Json;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.Infrastructure.Services;

public class PaymentServiceClient : IPaymentServiceClient
{
    private readonly HttpClient _httpClient;

    public PaymentServiceClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<CreditCheckResult> CheckCreditAsync(
        Guid    dealerId,
        decimal amount,
        CancellationToken ct = default)
    {
        try
        {
            var url      = $"/api/payment/dealers/{dealerId}/credit-check?amount={amount}";
            var response = await _httpClient.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                // If Payment Service is unreachable — default to approved
                // so orders are not blocked by infrastructure issues
                return new CreditCheckResult(true, 0);
            }

            var content = await response.Content.ReadAsStringAsync(ct);
            var result  = JsonSerializer.Deserialize<CreditCheckResponse>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return new CreditCheckResult(result?.Approved ?? true, result?.AvailableCredit ?? 0);
        }
        catch
        {
            // Fail open — don't block orders if Payment Service is temporarily down
            return new CreditCheckResult(true, 0);
        }
    }

    private record CreditCheckResponse(bool Approved, decimal AvailableCredit);
}
