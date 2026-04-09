using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace SupplyChain.Payment.Application.Commands.SimulatePayment;

public class SimulatePaymentCommandHandler : IRequestHandler<SimulatePaymentCommand, SimulatePaymentResult>
{
    private readonly IConfiguration _configuration;

    public SimulatePaymentCommandHandler(IConfiguration configuration)
        => _configuration = configuration;

    public Task<SimulatePaymentResult> Handle(SimulatePaymentCommand command, CancellationToken ct)
    {
        var keySecret = _configuration["Razorpay:KeySecret"];

        if (string.IsNullOrWhiteSpace(keySecret))
            throw new InvalidOperationException("Razorpay key secret is not configured.");

        // Generate a synthetic test payment ID (mimics Razorpay format)
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var paymentId = $"pay_Test{timestamp}";

        // Compute real HMAC-SHA256 signature — same as Razorpay would send
        var payload   = $"{command.RazorpayOrderId}|{paymentId}";
        var signature = ComputeHmacSha256(payload, keySecret);

        return Task.FromResult(new SimulatePaymentResult(
            RazorpayOrderId: command.RazorpayOrderId,
            RazorpayPaymentId: paymentId,
            RazorpaySignature: signature
        ));
    }

    private static string ComputeHmacSha256(string payload, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
