using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Order.Application.Commands.ApproveOrder;
using SupplyChain.Order.Application.Commands.ConfirmOrderPayment;
using SupplyChain.Order.Application.Commands.MarkDelivered;
using SupplyChain.Order.Application.Commands.MarkInTransit;
using SupplyChain.Order.Application.Commands.MarkReadyForDispatch;
using SupplyChain.Order.Application.Queries.GetOrderInvoiceDetails;
using SupplyChain.Order.Application.Queries.GetOrderNotificationDetails;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.API.Controllers;

[ApiController]
[Route("api/internal/orders")]
[Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
public class InternalOrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IOrderRepository _orderRepository;

    public InternalOrdersController(IMediator mediator, IOrderRepository orderRepository)
    {
        _mediator = mediator;
        _orderRepository = orderRepository;
    }

    [HttpPost("{orderId:guid}/confirm-payment")]
    public async Task<IActionResult> ConfirmPayment(
        Guid orderId,
        [FromBody] ConfirmOrderPaymentRequest request,
        CancellationToken ct)
    {
        if (request.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });

        await _mediator.Send(new ConfirmOrderPaymentCommand(orderId, request.DealerId, request.Amount), ct);
        return Ok(new { message = "Order payment confirmed." });
    }

    [HttpPost("{orderId:guid}/mark-payment-failed")]
    public async Task<IActionResult> MarkPaymentFailed(
        Guid orderId,
        [FromBody] MarkOrderPaymentFailedRequest request,
        CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, ct);
        if (order is null) return NotFound();

        if (order.PaymentStatus == PaymentStatus.Paid)
            return Conflict(new { message = "Paid orders cannot be marked as payment failed." });

        if (order.PaymentStatus == PaymentStatus.Failed || order.Status == OrderStatus.PaymentFailed)
            return Ok(new { message = "Order payment is already marked failed." });

        var marked = await _orderRepository.TryMarkPaymentFailedAsync(orderId, request.Reason ?? "Payment failed", ct);
        if (!marked)
            return Conflict(new { message = $"Order cannot be marked payment failed from {order.Status} / {order.PaymentStatus}." });

        await _orderRepository.SaveChangesAsync(ct);
        return Ok(new { message = "Order payment marked failed." });
    }

    [HttpGet("{orderId:guid}/notification-details")]
    public async Task<IActionResult> GetNotificationDetails(Guid orderId, CancellationToken ct)
    {
        var details = await _mediator.Send(new GetOrderNotificationDetailsQuery(orderId), ct);
        return Ok(details);
    }

    [HttpGet("{orderId:guid}/invoice-details")]
    public async Task<IActionResult> GetInvoiceDetails(Guid orderId, CancellationToken ct)
    {
        var details = await _mediator.Send(new GetOrderInvoiceDetailsQuery(orderId), ct);
        return Ok(details);
    }

    /// <summary>
    /// Internal endpoint called by the Logistics Service when assigning an agent.
    /// Auto-advances the order through any intermediate states (Placed/OnHold â†’ Processing â†’ ReadyForDispatch).
    /// Idempotent: if already ReadyForDispatch, returns 200 immediately.
    /// </summary>
    [HttpPut("{orderId:guid}/advance-to-dispatch")]
    public async Task<IActionResult> AdvanceToDispatch(Guid orderId, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, ct);
        if (order is null) return NotFound();

        // Already at target state or beyond â€” idempotent success
        if (order.Status == OrderStatus.ReadyForDispatch ||
            order.Status == OrderStatus.InTransit ||
            order.Status == OrderStatus.Delivered)
        {
            return Ok(new { message = "Order already at dispatch or beyond." });
        }

        if (order.Status == OrderStatus.PaymentPending || order.PaymentStatus != PaymentStatus.Paid)
        {
            return Conflict(new
            {
                message = "Order cannot be advanced to dispatch until payment is confirmed.",
                status = order.Status.ToString(),
                paymentStatus = order.PaymentStatus.ToString()
            });
        }

        // System actor for auto-advance
        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        // Step 1: If Placed or OnHold â†’ approve to Processing
        if (order.Status == OrderStatus.Placed || order.Status == OrderStatus.OnHold)
        {
            try { await _mediator.Send(new ApproveOrderCommand(orderId, systemActorId), ct); }
            catch { /* ignore if already transitioned */ }
        }

        order = await _orderRepository.GetByIdAsync(orderId, ct);
        if (order is null) return NotFound();

        // Step 2: Processing â†’ ReadyForDispatch
        if (order.Status == OrderStatus.Processing)
        {
            await _mediator.Send(new MarkReadyForDispatchCommand(orderId, systemActorId), ct);
        }
        else if (order.Status != OrderStatus.ReadyForDispatch)
        {
            return Conflict(new { message = $"Order cannot be advanced to dispatch from {order.Status}." });
        }

        return Ok(new { message = "Order advanced to ReadyForDispatch." });
    }

    [HttpPut("{orderId:guid}/mark-in-transit")]
    public async Task<IActionResult> MarkInTransit(Guid orderId, CancellationToken ct)
    {
        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        // Heal out-of-sync state transitions so logistics and order timelines stay consistent.
        while (true)
        {
            var order = await _orderRepository.GetByIdAsync(orderId, ct);
            if (order is null) return NotFound();

            if (order.Status == OrderStatus.InTransit || order.Status == OrderStatus.Delivered)
                return Ok(new { message = "Order already in transit or delivered." });

            if (order.Status == OrderStatus.Placed || order.Status == OrderStatus.OnHold)
            {
                await _mediator.Send(new ApproveOrderCommand(orderId, systemActorId), ct);
                continue;
            }

            if (order.Status == OrderStatus.Processing)
            {
                await _mediator.Send(new MarkReadyForDispatchCommand(orderId, systemActorId), ct);
                continue;
            }

            if (order.Status == OrderStatus.ReadyForDispatch)
            {
                await _mediator.Send(new MarkInTransitCommand(orderId, systemActorId), ct);
                break;
            }

            return Conflict(new { message = $"Order cannot be marked InTransit from {order.Status}." });
        }

        return Ok(new { message = "Order marked as InTransit." });
    }

    [HttpPut("{orderId:guid}/mark-delivered")]
    public async Task<IActionResult> MarkDelivered(Guid orderId, CancellationToken ct)
    {
        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        // Ensure delivery completion is eventually reflected in Order service state.
        while (true)
        {
            var order = await _orderRepository.GetByIdAsync(orderId, ct);
            if (order is null) return NotFound();

            if (order.Status == OrderStatus.Delivered)
                return Ok(new { message = "Order already delivered." });

            if (order.Status == OrderStatus.Placed || order.Status == OrderStatus.OnHold)
            {
                await _mediator.Send(new ApproveOrderCommand(orderId, systemActorId), ct);
                continue;
            }

            if (order.Status == OrderStatus.Processing)
            {
                await _mediator.Send(new MarkReadyForDispatchCommand(orderId, systemActorId), ct);
                continue;
            }

            if (order.Status == OrderStatus.ReadyForDispatch)
            {
                await _mediator.Send(new MarkInTransitCommand(orderId, systemActorId), ct);
                continue;
            }

            if (order.Status == OrderStatus.InTransit)
            {
                await _mediator.Send(new MarkDeliveredCommand(orderId, systemActorId), ct);
                break;
            }

            return Conflict(new { message = $"Order cannot be marked Delivered from {order.Status}." });
        }

        return Ok(new { message = "Order marked as Delivered." });
    }
}

public sealed record ConfirmOrderPaymentRequest(Guid DealerId, decimal Amount);
public sealed record MarkOrderPaymentFailedRequest(string? Reason);
