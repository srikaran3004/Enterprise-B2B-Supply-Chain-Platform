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
using SupplyChain.Order.Application.DTOs;
using SupplyChain.Order.Application.Queries.GetAllOrders;
using SupplyChain.Order.Application.Queries.GetMyOrders;
using SupplyChain.Order.Application.Queries.GetOrderById;
using SupplyChain.Order.Application.Views;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _environment;

    public OrdersController(IMediator mediator, IWebHostEnvironment environment)
    {
        _mediator = mediator;
        _environment = environment;
    }

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
        var view = new PagedResult<OrderSummaryView>
        {
            Items = orders.Items.Select(OrderSummaryView.FromDto).ToList(),
            TotalCount = orders.TotalCount,
            Page = orders.Page,
            PageSize = orders.PageSize
        };
        return Ok(view);
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
        var view = new PagedResult<OrderSummaryView>
        {
            Items = orders.Items.Select(OrderSummaryView.FromDto).ToList(),
            TotalCount = orders.TotalCount,
            Page = orders.Page,
            PageSize = orders.PageSize
        };
        return Ok(view);
    }

    /// <summary>Get single order detail.</summary>
    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetOrder(Guid orderId, CancellationToken ct)
    {
        var order = await _mediator.Send(new GetOrderByIdQuery(orderId), ct);

        if (User.IsInRole("Dealer"))
        {
            var dealerId = GetDealerId();
            if (order.DealerId != dealerId)
                return Forbid();
        }

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
        var dealerId = User.IsInRole("Dealer") ? GetDealerId() : (Guid?)null;
        var dealerEmail = dealerId.HasValue ? actorEmail : null;

        await _mediator.Send(new CancelOrderCommand(orderId, actorId, request.Reason, dealerEmail, dealerId), ct);
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

    /// <summary>Upload return proof image and get a reusable URL.</summary>
    [HttpPost("upload-return-image")]
    [Authorize(Roles = "Dealer")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadReturnImage([FromForm] IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { Message = "Image file is required." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { Message = "Image size must be 5 MB or less." });

        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        if (!allowedContentTypes.Contains(file.ContentType))
            return BadRequest(new { Message = "Only JPG, PNG, and WEBP images are supported." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { Message = "Invalid image extension. Use JPG, PNG, or WEBP." });

        var fileName = $"return-{Guid.NewGuid():N}{extension}";
        var root = Path.Combine(_environment.ContentRootPath, "uploads", "returns");
        Directory.CreateDirectory(root);

        var fullPath = Path.Combine(root, fileName);
        await using var stream = System.IO.File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        return Ok(new { Url = $"/api/orders/return-images/{fileName}" });
    }

    /// <summary>Get uploaded return proof image.</summary>
    [HttpGet("return-images/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetReturnImage(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return BadRequest(new { Message = "File name is required." });

        var safeFileName = Path.GetFileName(fileName);
        if (!string.Equals(fileName, safeFileName, StringComparison.Ordinal))
            return BadRequest(new { Message = "Invalid file name." });

        var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(contentType))
            return BadRequest(new { Message = "Unsupported image type." });

        var fullPath = Path.Combine(_environment.ContentRootPath, "uploads", "returns", safeFileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { Message = "Image not found." });

        return PhysicalFile(fullPath, contentType);
    }

    // ── Helpers ──────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        if (Guid.TryParse(sub, out var id))
            return id;

        throw new UnauthorizedAccessException("Authenticated user id claim is missing or invalid.");
    }

    private Guid GetDealerId()
    {
        var claim = User.FindFirst("dealerId")?.Value;
        if (Guid.TryParse(claim, out var id))
            return id;

        throw new UnauthorizedAccessException("Dealer token does not contain a valid dealerId claim.");
    }
}

public record CancelRequest(string Reason);
public record RaiseReturnRequest(string Reason, string? PhotoUrl = null);
