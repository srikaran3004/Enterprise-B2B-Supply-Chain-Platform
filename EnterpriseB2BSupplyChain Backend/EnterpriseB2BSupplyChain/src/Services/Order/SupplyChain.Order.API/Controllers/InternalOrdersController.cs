using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Order.Application.Commands.ApproveOrder;
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

        // System actor for auto-advance
        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        // Step 1: If Placed or OnHold â†’ approve to Processing
        if (order.Status == OrderStatus.Placed || order.Status == OrderStatus.OnHold)
        {
            try { await _mediator.Send(new ApproveOrderCommand(orderId, systemActorId), ct); }
            catch { /* ignore if already transitioned */ }
        }

        // Step 2: Processing â†’ ReadyForDispatch
        try { await _mediator.Send(new MarkReadyForDispatchCommand(orderId, systemActorId), ct); }
        catch { /* ignore if already transitioned */ }

        return Ok(new { message = "Order advanced to ReadyForDispatch." });
    }

    [HttpPut("{orderId:guid}/mark-in-transit")]
    public async Task<IActionResult> MarkInTransit(Guid orderId, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, ct);
        if (order is null) return NotFound();

        if (order.Status == OrderStatus.InTransit || order.Status == OrderStatus.Delivered)
            return Ok(new { message = "Order already in transit or delivered." });

        if (order.Status != OrderStatus.ReadyForDispatch)
            return Conflict(new { message = $"Order cannot be marked InTransit from {order.Status}." });

        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        await _mediator.Send(new MarkInTransitCommand(orderId, systemActorId), ct);
        return Ok(new { message = "Order marked as InTransit." });
    }

    [HttpPut("{orderId:guid}/mark-delivered")]
    public async Task<IActionResult> MarkDelivered(Guid orderId, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, ct);
        if (order is null) return NotFound();

        if (order.Status == OrderStatus.Delivered)
            return Ok(new { message = "Order already delivered." });

        if (order.Status != OrderStatus.InTransit)
            return Conflict(new { message = $"Order cannot be marked Delivered from {order.Status}." });

        var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        await _mediator.Send(new MarkDeliveredCommand(orderId, systemActorId), ct);
        return Ok(new { message = "Order marked as Delivered." });
    }
}

