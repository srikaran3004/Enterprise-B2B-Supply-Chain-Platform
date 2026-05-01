namespace SupplyChain.Payment.Application.Abstractions;

public interface IOrderPaymentConfirmationClient
{
    Task ConfirmPaymentAsync(Guid orderId, Guid dealerId, decimal amount, CancellationToken ct = default);
    Task MarkPaymentFailedAsync(Guid orderId, string reason, CancellationToken ct = default);
}
