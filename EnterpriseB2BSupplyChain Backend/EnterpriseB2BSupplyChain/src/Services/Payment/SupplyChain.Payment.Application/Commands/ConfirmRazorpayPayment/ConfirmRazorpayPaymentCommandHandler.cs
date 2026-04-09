using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;

public class ConfirmRazorpayPaymentCommandHandler : IRequestHandler<ConfirmRazorpayPaymentCommand, RazorpayConfirmationResult>
{
    private readonly IConfiguration _configuration;

    public ConfirmRazorpayPaymentCommandHandler(IConfiguration configuration)
        => _configuration = configuration;

    public Task<RazorpayConfirmationResult> Handle(ConfirmRazorpayPaymentCommand command, CancellationToken ct)
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

        return Task.FromResult(new RazorpayConfirmationResult(
            Verified: isValid,
            Message: isValid ? "Payment signature verified." : "Invalid payment signature.",
            RazorpayOrderId: command.RazorpayOrderId,
            RazorpayPaymentId: command.RazorpayPaymentId,
            OrderId: command.OrderId,
            ConfirmedAtUtc: DateTime.UtcNow
        ));
    }

    private static string ComputeHmacSha256(string payload, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}