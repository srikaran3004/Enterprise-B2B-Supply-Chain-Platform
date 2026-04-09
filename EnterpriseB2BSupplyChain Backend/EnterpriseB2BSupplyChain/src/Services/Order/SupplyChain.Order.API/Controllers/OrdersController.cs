using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SupplyChain.Order.Application.Commands.ApproveOrder;
using SupplyChain.Order.Application.Commands.CancelOrder;
using SupplyChain.Order.Application.Commands.MarkDelivered;
using SupplyChain.Order.Application.Commands.MarkInTransit;
using SupplyChain.Order.Application.Commands.MarkReadyForDispatch;
using SupplyChain.Order.Application.Commands.PlaceOrder;
using SupplyChain.Order.Application.Commands.RaiseReturn;
using SupplyChain.Order.Application.Queries.GetAllOrders;
using SupplyChain.Order.Application.Queries.GetMyOrders;
using SupplyChain.Order.Application.Queries.GetOrderById;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator) => _mediator = mediator;

    /// <summary>Place a new bulk order. Dealer only.</summary>
    [HttpPost]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderCommand command,
        CancellationToken ct)
    {
        // Override DealerId from JWT — never trust body for identity
        var dealerId     = GetDealerId();
        var dealerEmail  = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value;
        var dealerName   = User.FindFirst("businessName")?.Value
                        ?? User.FindFirst("fullName")?.Value;
        var safeCommand  = command with { DealerId = dealerId, DealerEmail = dealerEmail, DealerName = dealerName };
        var result       = await _mediator.Send(safeCommand, ct);
        return CreatedAtAction(nameof(GetOrder), new { orderId = result.OrderId }, result);
    }

    /// <summary>Get dealer's own orders.</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken   ct     = default)
    {
        var dealerId     = GetDealerId();
        OrderStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var s))
            parsedStatus = s;

        var orders = await _mediator.Send(new GetMyOrdersQuery(dealerId, parsedStatus, page, pageSize), ct);
        return Ok(orders);
    }

    /// <summary>Get all orders (Admin only).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAllOrders(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken   ct     = default)
    {
        OrderStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var s))
            parsedStatus = s;

        var orders = await _mediator.Send(new GetAllOrdersQuery(parsedStatus, page, pageSize), ct);
        return Ok(orders);
    }

    /// <summary>Get single order detail.</summary>
    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetOrder(Guid orderId, CancellationToken ct)
    {
        var order = await _mediator.Send(new GetOrderByIdQuery(orderId), ct);
        return Ok(order);
    }

    /// <summary>Admin approves an OnHold order.</summary>
    [HttpPut("{orderId:guid}/approve")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ApproveOrder(Guid orderId, CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new ApproveOrderCommand(orderId, adminId), ct);
        return Ok(new { Message = "Order approved and moved to Processing." });
    }

    /// <summary>Cancel an order (Dealer or Admin).</summary>
    [HttpPut("{orderId:guid}/cancel")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> CancelOrder(
        Guid orderId,
        [FromBody] CancelRequest request,
        CancellationToken ct)
    {
        var actorId = GetCurrentUserId();
        var actorEmail = User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
        var dealerEmail = User.IsInRole("Dealer") ? actorEmail : null;

        await _mediator.Send(new CancelOrderCommand(orderId, actorId, request.Reason, dealerEmail), ct);
        return Ok(new { Message = "Order cancelled." });
    }

    /// <summary>Admin marks order as Ready for Dispatch.</summary>
    [HttpPut("{orderId:guid}/ready-for-dispatch")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> MarkReadyForDispatch(Guid orderId, CancellationToken ct)
    {
        var managerId = GetCurrentUserId();
        await _mediator.Send(new MarkReadyForDispatchCommand(orderId, managerId), ct);
        return Ok(new { Message = "Order marked as Ready for Dispatch. Logistics Saga triggered." });
    }

    /// <summary>Mark order as In Transit (called by Logistics Service internally).</summary>
    [HttpPut("{orderId:guid}/in-transit")]
    [Authorize(Roles = "Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> MarkInTransit(Guid orderId, CancellationToken ct)
    {
        var actorId = GetCurrentUserId();
        await _mediator.Send(new MarkInTransitCommand(orderId, actorId), ct);
        return Ok(new { Message = "Order is now In Transit." });
    }

    /// <summary>Mark order as Delivered.</summary>
    [HttpPut("{orderId:guid}/delivered")]
    [Authorize(Roles = "DeliveryAgent")]
    public async Task<IActionResult> MarkDelivered(Guid orderId, CancellationToken ct)
    {
        var actorId = GetCurrentUserId();
        await _mediator.Send(new MarkDeliveredCommand(orderId, actorId), ct);
        return Ok(new { Message = "Order marked as Delivered. Invoice generation triggered." });
    }

    /// <summary>Dealer raises a return/dispute request.</summary>
    [HttpPost("{orderId:guid}/returns")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> RaiseReturn(
        Guid orderId,
        [FromBody] RaiseReturnRequest request,
        CancellationToken ct)
    {
        var dealerId = GetDealerId();
        await _mediator.Send(new RaiseReturnCommand(orderId, dealerId, request.Reason, request.PhotoUrl), ct);
        return Ok(new { Message = "Return request raised. Warehouse team will review." });
    }

    // ── Helpers ──────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private Guid GetDealerId()
    {
        var claim = User.FindFirst("dealerId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }
}

public record CancelRequest(string Reason);
public record RaiseReturnRequest(string Reason, string? PhotoUrl = null);
