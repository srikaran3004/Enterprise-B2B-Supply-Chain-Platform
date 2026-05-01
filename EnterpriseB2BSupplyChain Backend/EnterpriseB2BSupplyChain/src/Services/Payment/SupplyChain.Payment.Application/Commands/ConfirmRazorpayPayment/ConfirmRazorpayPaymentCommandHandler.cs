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
    private readonly IOrderPaymentConfirmationClient _orderPaymentConfirmationClient;
    private readonly ILogger<ConfirmRazorpayPaymentCommandHandler> _logger;

    public ConfirmRazorpayPaymentCommandHandler(
        IConfiguration configuration,
        IPaymentRecordRepository paymentRecordRepository,
        IOutboxRepository outboxRepository,
        ICreditAccountRepository creditAccountRepository,
        IOrderPaymentConfirmationClient orderPaymentConfirmationClient,
        ILogger<ConfirmRazorpayPaymentCommandHandler> logger)
    {
        _configuration = configuration;
        _paymentRecordRepository = paymentRecordRepository;
        _outboxRepository = outboxRepository;
        _creditAccountRepository = creditAccountRepository;
        _orderPaymentConfirmationClient = orderPaymentConfirmationClient;
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
                var dealerId = command.DealerId.Value;
                var amount = command.Amount.Value;

                _logger.LogInformation(
                    "Payment signature verified. Processing payment record for OrderId={OrderId}, DealerId={DealerId}, Amount={Amount}, RazorpayPaymentId={RazorpayPaymentId}",
                    orderId, dealerId, amount, command.RazorpayPaymentId);

                var paymentRecord = await _paymentRecordRepository.GetByOrderIdAsync(orderId, ct);
                var wasAlreadyPaid = paymentRecord?.Status.Equals("Paid", StringComparison.OrdinalIgnoreCase) == true;

                if (paymentRecord is null)
                {
                    _logger.LogInformation(
                        "Creating new payment record for OrderId={OrderId}",
                        orderId);

                    paymentRecord = PaymentRecord.Create(
                        orderId: orderId,
                        dealerId: dealerId,
                        amount: amount,
                        paymentMode: "Prepaid");

                    await _paymentRecordRepository.AddAsync(paymentRecord, ct);
                }
                else
                {
                    _logger.LogInformation(
                        "Payment record already exists for OrderId={OrderId}. Updating status.",
                        orderId);
                }

                paymentRecord.MarkPaid(command.RazorpayPaymentId);

                var eventPayload = JsonSerializer.Serialize(new
                {
                    OrderId = orderId,
                    DealerId = dealerId,
                    Amount = amount
                });
                var outboxMessage = OutboxMessage.Create("PaymentSuccessful", eventPayload);
                await _outboxRepository.AddAsync(outboxMessage, ct);

                await _paymentRecordRepository.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Payment record saved. Confirming order payment synchronously for OrderId={OrderId}",
                    orderId);

                await _orderPaymentConfirmationClient.ConfirmPaymentAsync(orderId, dealerId, amount, ct);

                _logger.LogInformation(
                    "Order payment confirmed synchronously for OrderId={OrderId}",
                    orderId);

                if (!wasAlreadyPaid)
                {
                    // Update utilized purchase limit after Order service has checked the limit.
                    var account = await _creditAccountRepository.GetByDealerIdAsync(dealerId, ct);
                    if (account is null)
                    {
                        _logger.LogInformation(
                            "Creating new credit account for DealerId={DealerId}",
                            dealerId);
                        account = DealerCreditAccount.Create(dealerId);
                        await _creditAccountRepository.AddAsync(account, ct);
                    }
                    account.EnsureMonthlyReset(DateTime.UtcNow);
                    account.AddOutstanding(amount);
                }

                _logger.LogInformation(
                    "PaymentSuccessful event queued in outbox. MessageId={MessageId}, OrderId={OrderId}",
                    outboxMessage.MessageId, orderId);

                await _paymentRecordRepository.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Payment confirmation completed for OrderId={OrderId}. PaymentSuccessful event remains available as fallback.",
                    orderId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Razorpay signature verified but PaymentRecord persistence failed for OrderId={OrderId}, DealerId={DealerId}. Payment may need manual reconciliation.",
                    command.OrderId, command.DealerId);
                // Re-throw to ensure the caller knows the operation failed
                throw;
            }
        }
        else
        {
            if (!isValid)
            {
                _logger.LogWarning(
                    "Invalid Razorpay signature. OrderId={OrderId}, RazorpayOrderId={RazorpayOrderId}",
                    command.OrderId, command.RazorpayOrderId);
            }
            else
            {
                _logger.LogWarning(
                    "Payment verification succeeded but missing required data. OrderId={OrderId}, DealerId={DealerId}, Amount={Amount}",
                    command.OrderId, command.DealerId, command.Amount);
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
