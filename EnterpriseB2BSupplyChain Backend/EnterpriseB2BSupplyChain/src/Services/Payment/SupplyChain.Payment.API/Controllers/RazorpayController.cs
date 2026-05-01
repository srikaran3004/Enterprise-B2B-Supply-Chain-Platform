using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.Commands.CreateRazorpayOrder;
using SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;
using SupplyChain.Payment.Application.Commands.SimulatePayment;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.API.Controllers;

[ApiController]
[Route("api/payment/razorpay")]
[Authorize]
public class RazorpayController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IPaymentRecordRepository _paymentRecordRepository;
    private readonly IOrderPaymentConfirmationClient _orderPaymentConfirmationClient;

    public RazorpayController(
        IMediator mediator,
        IPaymentRecordRepository paymentRecordRepository,
        IOrderPaymentConfirmationClient orderPaymentConfirmationClient)
    {
        _mediator = mediator;
        _paymentRecordRepository = paymentRecordRepository;
        _orderPaymentConfirmationClient = orderPaymentConfirmationClient;
    }

    [HttpPost("create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateRazorpayOrderRequest request, CancellationToken ct)
    {
        var orderId = await _mediator.Send(new CreateRazorpayOrderCommand(request.Amount, request.ReceiptId), ct);
        return Ok(new { RazorpayOrderId = orderId });
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmRazorpayPaymentRequest request, CancellationToken ct)
    {
        var dealerId = GetDealerIdOrNull();
        if (!request.OrderId.HasValue || !request.Amount.HasValue || request.Amount.Value <= 0 || !dealerId.HasValue)
        {
            return BadRequest(new { Message = "OrderId, Amount, and dealer identity are required to confirm payment." });
        }

        var result = await _mediator.Send(new ConfirmRazorpayPaymentCommand(
            request.RazorpayOrderId,
            request.RazorpayPaymentId,
            request.RazorpaySignature,
            request.OrderId,
            request.Amount,
            dealerId
        ), ct);

        if (!result.Verified)
            return BadRequest("Invalid Razorpay signature.");

        return Ok(new { Message = "Payment verified successfully." });
    }

    [HttpPost("failed")]
    public async Task<IActionResult> MarkPaymentFailed([FromBody] RazorpayPaymentFailedRequest request, CancellationToken ct)
    {
        var dealerId = GetDealerIdOrNull();
        if (!request.OrderId.HasValue || !request.Amount.HasValue || request.Amount.Value <= 0 || !dealerId.HasValue)
        {
            return BadRequest(new { Message = "OrderId, Amount, and dealer identity are required to mark payment failed." });
        }

        var paymentRecord = await _paymentRecordRepository.GetByOrderIdAsync(request.OrderId.Value, ct);
        if (paymentRecord is null)
        {
            paymentRecord = PaymentRecord.Create(
                request.OrderId.Value,
                dealerId.Value,
                request.Amount.Value,
                "Prepaid");
            await _paymentRecordRepository.AddAsync(paymentRecord, ct);
        }

        paymentRecord.MarkFailed(request.RazorpayPaymentId);
        await _paymentRecordRepository.SaveChangesAsync(ct);

        await _orderPaymentConfirmationClient.MarkPaymentFailedAsync(
            request.OrderId.Value,
            request.ErrorDescription ?? request.ErrorReason ?? "Razorpay payment failed",
            ct);

        return Ok(new { Message = "Payment failure recorded." });
    }

    /// <summary>
    /// TEST MODE: Generates a synthetic payment ID and valid HMAC signature.
    /// Call this instead of showing the Razorpay UI during development/demo.
    /// </summary>
    [HttpPost("simulate-capture")]
    public async Task<IActionResult> SimulateCapture([FromBody] SimulateCaptureRequest request, CancellationToken ct)
    {
        var dealerId = GetDealerIdOrNull();
        if (!request.OrderId.HasValue || !request.Amount.HasValue || request.Amount.Value <= 0 || !dealerId.HasValue)
        {
            return BadRequest(new { Message = "OrderId, Amount, and dealer identity are required to confirm payment." });
        }

        var result = await _mediator.Send(new SimulatePaymentCommand(request.RazorpayOrderId), ct);

        // Immediately confirm the simulated payment
        var confirmation = await _mediator.Send(new ConfirmRazorpayPaymentCommand(
            result.RazorpayOrderId,
            result.RazorpayPaymentId,
            result.RazorpaySignature,
            request.OrderId,
            request.Amount,
            dealerId
        ), ct);

        if (!confirmation.Verified)
            return StatusCode(500, "Simulation signature verification failed.");

        return Ok(new
        {
            razorpayOrderId  = result.RazorpayOrderId,
            razorpayPaymentId = result.RazorpayPaymentId,
            razorpaySignature = result.RazorpaySignature,
            message          = "Payment simulated and verified successfully."
        });
    }

    private Guid? GetDealerIdOrNull()
    {
        var claim = User.FindFirst("dealerId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record CreateRazorpayOrderRequest(decimal Amount, string ReceiptId);
public record ConfirmRazorpayPaymentRequest(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature,
    Guid? OrderId = null,
    decimal? Amount = null
);
public record RazorpayPaymentFailedRequest(
    Guid? OrderId = null,
    decimal? Amount = null,
    string? RazorpayPaymentId = null,
    string? ErrorCode = null,
    string? ErrorDescription = null,
    string? ErrorReason = null
);
public record SimulateCaptureRequest(
    string RazorpayOrderId,
    Guid? OrderId = null,
    decimal? Amount = null
);
