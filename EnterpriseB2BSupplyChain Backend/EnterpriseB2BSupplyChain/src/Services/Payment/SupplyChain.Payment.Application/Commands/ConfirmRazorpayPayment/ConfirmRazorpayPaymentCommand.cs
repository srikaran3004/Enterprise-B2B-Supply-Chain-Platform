using MediatR;

namespace SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;

public record ConfirmRazorpayPaymentCommand(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature,
    Guid? OrderId = null,
    decimal? Amount = null,
    Guid? DealerId = null
) : IRequest<RazorpayConfirmationResult>;

public record RazorpayConfirmationResult(
    bool Verified,
    string Message,
    string RazorpayOrderId,
    string RazorpayPaymentId,
    Guid? OrderId,
    DateTime ConfirmedAtUtc
);
