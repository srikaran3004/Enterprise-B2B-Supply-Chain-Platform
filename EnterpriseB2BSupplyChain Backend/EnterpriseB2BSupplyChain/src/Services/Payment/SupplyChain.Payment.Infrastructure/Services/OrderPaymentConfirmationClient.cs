using System.Net.Http.Json;
using SupplyChain.Payment.Application.Abstractions;

namespace SupplyChain.Payment.Infrastructure.Services;

public class OrderPaymentConfirmationClient : IOrderPaymentConfirmationClient
{
    private readonly HttpClient _httpClient;

    public OrderPaymentConfirmationClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task ConfirmPaymentAsync(Guid orderId, Guid dealerId, decimal amount, CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync(
            $"/api/internal/orders/{orderId}/confirm-payment",
            new ConfirmOrderPaymentRequest(dealerId, amount),
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"Order payment confirmation failed with HTTP {(int)response.StatusCode}: {body}");
        }
    }

    private sealed record ConfirmOrderPaymentRequest(Guid DealerId, decimal Amount);

    public async Task MarkPaymentFailedAsync(Guid orderId, string reason, CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync(
            $"/api/internal/orders/{orderId}/mark-payment-failed",
            new MarkOrderPaymentFailedRequest(reason),
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"Order payment failure update failed with HTTP {(int)response.StatusCode}: {body}");
        }
    }

    private sealed record MarkOrderPaymentFailedRequest(string Reason);
}
