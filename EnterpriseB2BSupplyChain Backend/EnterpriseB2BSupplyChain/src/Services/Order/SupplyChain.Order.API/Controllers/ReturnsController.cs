using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Order.Application.Commands.Returns;
using SupplyChain.Order.Application.Queries.Returns;

namespace SupplyChain.Order.API.Controllers;

[ApiController]
[Route("api/returns")]
[Authorize]
public class ReturnsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReturnsController(IMediator mediator) => _mediator = mediator;

    [HttpGet("my")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> GetMyReturns([FromQuery] string? status, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        var returns = await _mediator.Send(new GetMyReturnsQuery(dealerId, status), ct);
        return Ok(returns);
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAllReturns([FromQuery] string? status, CancellationToken ct)
    {
        var returns = await _mediator.Send(new GetAllReturnsQuery(status), ct);
        return Ok(returns);
    }

    [HttpPut("{returnId:guid}/approve")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ApproveReturn(Guid returnId, [FromBody] ReturnActionRequest request, CancellationToken ct)
    {
        var adminId = GetUserId();
        await _mediator.Send(new ApproveReturnCommand(returnId, adminId, request.AdminNotes), ct);
        return Ok(new { Message = "Return request approved." });
    }

    [HttpPut("{returnId:guid}/reject")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> RejectReturn(Guid returnId, [FromBody] ReturnActionRequest request, CancellationToken ct)
    {
        var adminId = GetUserId();
        await _mediator.Send(new RejectReturnCommand(returnId, adminId, request.AdminNotes), ct);
        return Ok(new { Message = "Return request rejected." });
    }

    // ── Helpers ──────────────────────────────────────────────────
    private Guid GetUserId()
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

public record ReturnActionRequest(string? AdminNotes);
