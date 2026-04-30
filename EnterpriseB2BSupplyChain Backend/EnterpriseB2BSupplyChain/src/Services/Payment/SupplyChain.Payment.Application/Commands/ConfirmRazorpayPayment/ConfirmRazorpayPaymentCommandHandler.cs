using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Domain.Entities;
using System.Text.Json;

namespace SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;

public class ConfirmRazorpayPaymentCommandHandler : IRequestHandler<ConfirmRazorpayPaymentCommand, RazorpayConfirmationResult>
{
    private readonly IConfiguration _configuration;
    private readonly IPaymentRecordRepository _paymentRecordRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly ICreditAccountRepository _creditAccountRepository;
    private readonly ILogger<ConfirmRazorpayPaymentCommandHandler> _logger;

    public ConfirmRazorpayPaymentCommandHandler(
        IConfiguration configuration,
        IPaymentRecordRepository paymentRecordRepository,
        IOutboxRepository outboxRepository,
        ICreditAccountRepository creditAccountRepository,
        ILogger<ConfirmRazorpayPaymentCommandHandler> logger)
    {
        _configuration = configuration;
        _paymentRecordRepository = paymentRecordRepository;
        _outboxRepository = outboxRepository;
        _creditAccountRepository = creditAccountRepository;
        _logger = logger;
    }

    public async Task<RazorpayConfirmationResult> Handle(ConfirmRazorpayPaymentCommand command, CancellationToken ct)
    {
        var keySecret = _configuration["Razorpay:KeySecret"];

        if (string.IsNullOrWhiteSpace(keySecret))
            throw new InvalidOperationException("Razorpay key secret is not configured.");

        var payload = $"{command.RazorpayOrderId}|{command.RazorpayPaymentId}";
        var generatedSignature = ComputeHmacSha256(payload, keySecret);

        var isValid = string.Equals(
            generatedSignature,
            command.RazorpaySignature,
            StringComparison.OrdinalIgnoreCase);

        if (isValid &&
            command.OrderId.HasValue &&
            command.DealerId.HasValue &&
            command.Amount.HasValue &&
            command.Amount.Value > 0)
        {
            try
            {
                var orderId = command.OrderId.Value;
                var paymentRecord = await _paymentRecordRepository.GetByOrderIdAsync(orderId, ct);

                if (paymentRecord is null)
                {
                    paymentRecord = PaymentRecord.Create(
                        orderId: orderId,
                        dealerId: command.DealerId.Value,
                        amount: command.Amount.Value,
                        paymentMode: "Prepaid");

                    await _paymentRecordRepository.AddAsync(paymentRecord, ct);
                }

                paymentRecord.MarkPaid(command.RazorpayPaymentId);

                // Ensure the DealerCreditAccount is updated with the AddOutstanding amount
                var account = await _creditAccountRepository.GetByDealerIdAsync(command.DealerId.Value, ct);
                if (account is null)
                {
                    account = DealerCreditAccount.Create(command.DealerId.Value);
                    await _creditAccountRepository.AddAsync(account, ct);
                }
                account.EnsureMonthlyReset(DateTime.UtcNow);
                account.AddOutstanding(command.Amount.Value);

                var eventPayload = JsonSerializer.Serialize(new
                {
                    OrderId = command.OrderId.Value,
                    DealerId = command.DealerId.Value,
                    Amount = command.Amount.Value
                });
                var outboxMessage = OutboxMessage.Create("PaymentSuccessful", eventPayload);
                await _outboxRepository.AddAsync(outboxMessage, ct);

                await _paymentRecordRepository.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Razorpay signature verified but PaymentRecord persistence failed for OrderId={OrderId}",
                    command.OrderId);
            }
        }

        return new RazorpayConfirmationResult(
            Verified: isValid,
            Message: isValid ? "Payment signature verified." : "Invalid payment signature.",
            RazorpayOrderId: command.RazorpayOrderId,
            RazorpayPaymentId: command.RazorpayPaymentId,
            OrderId: command.OrderId,
            ConfirmedAtUtc: DateTime.UtcNow
        );
    }

    private static string ComputeHmacSha256(string payload, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
