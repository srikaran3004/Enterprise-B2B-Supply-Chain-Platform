using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Payment.Application.Commands.CreateRazorpayOrder;
using SupplyChain.Payment.Application.Commands.ConfirmRazorpayPayment;
using SupplyChain.Payment.Application.Commands.SimulatePayment;

namespace SupplyChain.Payment.API.Controllers;

[ApiController]
[Route("api/payment/razorpay")]
[Authorize]
public class RazorpayController : ControllerBase
{
    private readonly IMediator _mediator;

    public RazorpayController(IMediator mediator) => _mediator = mediator;

    [HttpPost("create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateRazorpayOrderRequest request, CancellationToken ct)
    {
        var orderId = await _mediator.Send(new CreateRazorpayOrderCommand(request.Amount, request.ReceiptId), ct);
        return Ok(new { RazorpayOrderId = orderId });
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmRazorpayPaymentRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ConfirmRazorpayPaymentCommand(
            request.RazorpayOrderId,
            request.RazorpayPaymentId,
            request.RazorpaySignature
        ), ct);

        if (!result.Verified)
            return BadRequest("Invalid Razorpay signature.");

        return Ok(new { Message = "Payment verified successfully." });
    }

    /// <summary>
    /// TEST MODE: Generates a synthetic payment ID and valid HMAC signature.
    /// Call this instead of showing the Razorpay UI during development/demo.
    /// </summary>
    [HttpPost("simulate-capture")]
    public async Task<IActionResult> SimulateCapture([FromBody] SimulateCaptureRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new SimulatePaymentCommand(request.RazorpayOrderId), ct);

        // Immediately confirm the simulated payment
        var confirmation = await _mediator.Send(new ConfirmRazorpayPaymentCommand(
            result.RazorpayOrderId,
            result.RazorpayPaymentId,
            result.RazorpaySignature
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
}

public record CreateRazorpayOrderRequest(decimal Amount, string ReceiptId);
public record ConfirmRazorpayPaymentRequest(string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);
public record SimulateCaptureRequest(string RazorpayOrderId);
