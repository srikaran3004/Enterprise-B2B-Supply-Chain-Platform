using MediatR;

namespace SupplyChain.Payment.Application.Commands.SimulatePayment;

/// <summary>
/// TEST MODE ONLY — generates a synthetic payment ID and valid HMAC signature
/// so the Razorpay confirm endpoint can verify it without a real bank transaction.
/// </summary>
public record SimulatePaymentCommand(string RazorpayOrderId) : IRequest<SimulatePaymentResult>;

public record SimulatePaymentResult(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature
);
