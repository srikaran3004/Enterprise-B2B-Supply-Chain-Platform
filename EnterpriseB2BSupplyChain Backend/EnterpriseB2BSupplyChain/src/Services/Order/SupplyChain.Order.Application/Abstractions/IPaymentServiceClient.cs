namespace SupplyChain.Order.Application.Abstractions;

public interface IPaymentServiceClient
{
    Task<CreditCheckResult> CheckCreditAsync(Guid dealerId, decimal amount, CancellationToken ct = default);
}

public record CreditCheckResult(bool Approved, decimal AvailableCredit);
