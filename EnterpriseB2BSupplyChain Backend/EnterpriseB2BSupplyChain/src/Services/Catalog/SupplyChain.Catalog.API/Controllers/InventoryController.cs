using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Catalog.Application.Commands.RestockProduct;
using SupplyChain.Catalog.Application.Commands.ReserveInventory;
using SupplyChain.Catalog.Application.Commands.ReleaseInventory;
using System.Security.Claims;

namespace SupplyChain.Catalog.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryController(IMediator mediator) => _mediator = mediator;

    [HttpPost("restock")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Restock(
        [FromBody] RestockRequest request,
        CancellationToken ct)
    {
        await _mediator.Send(
            new RestockProductCommand(request.ProductId, request.Quantity, request.Notes), ct);

        return Ok(new { Message = $"{request.Quantity} units added to stock." });
    }

    /// <summary>
    /// Reserve inventory for cart items (Dealer only)
    /// </summary>
    [HttpPost("reserve")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> ReserveInventory(
        [FromBody] ReserveInventoryRequest request,
        CancellationToken ct)
    {
        var dealerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _mediator.Send(
            new ReserveInventoryCommand(dealerId, request.ProductId, request.Quantity), ct);

        if (!result.Success)
        {
            return BadRequest(new { 
                Message = result.Message, 
                AvailableQuantity = result.AvailableQuantity 
            });
        }

        return Ok(new { 
            Message = result.Message,
            ReservedQuantity = result.AvailableQuantity
        });
    }

    /// <summary>
    /// Release inventory reservation (remove from cart)
    /// </summary>
    [HttpPost("release")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> ReleaseInventory(
        [FromBody] ReleaseInventoryRequest request,
        CancellationToken ct)
    {
        var dealerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await _mediator.Send(
            new ReleaseInventoryCommand(dealerId, request.ProductId), ct);

        return Ok(new { Message = "Reservation released successfully" });
    }

    /// <summary>
    /// Clear all cart reservations for dealer
    /// </summary>
    [HttpPost("release-all")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> ReleaseAllInventory(CancellationToken ct)
    {
        var dealerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await _mediator.Send(
            new ReleaseInventoryCommand(dealerId, null), ct);

        return Ok(new { Message = "All reservations released successfully" });
    }
}

public record RestockRequest(Guid ProductId, int Quantity, string? Notes);
public record ReserveInventoryRequest(Guid ProductId, int Quantity);
public record ReleaseInventoryRequest(Guid? ProductId);
