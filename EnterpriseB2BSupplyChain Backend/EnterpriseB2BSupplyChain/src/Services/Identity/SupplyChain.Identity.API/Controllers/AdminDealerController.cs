using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Identity.Application.Commands.ApproveDealer;
using SupplyChain.Identity.Application.Commands.DeleteDealer;
using SupplyChain.Identity.Application.Commands.ReactivateDealer;
using SupplyChain.Identity.Application.Commands.RejectDealer;
using SupplyChain.Identity.Application.Commands.SuspendDealer;
using SupplyChain.Identity.Application.Queries.GetDealerList;
using SupplyChain.Identity.Application.Views;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/admin/dealers")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminDealerController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminDealerController(IMediator mediator)
        => _mediator = mediator;

    /// <summary>Get all dealers, optionally filtered by status.</summary>
    [HttpGet]
    public async Task<IActionResult> GetDealers(
        [FromQuery] string? status,
        CancellationToken ct)
    {
        UserStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<UserStatus>(status, true, out var s))
            parsedStatus = s;

        try
        {
            var dealers = await _mediator.Send(new GetDealerListQuery(parsedStatus), ct);
            return Ok(dealers.Select(DealerProfileView.FromDto).ToList());
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            return StatusCode(499, new { Message = "Request cancelled by client." });
        }
    }

    /// <summary>Approve a pending dealer.</summary>
    [HttpPut("{dealerId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid dealerId, CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new ApproveDealerCommand(dealerId, adminId), ct);
        return Ok(new { Message = "Dealer approved successfully." });
    }

    /// <summary>Reject a pending dealer with a reason.</summary>
    [HttpPut("{dealerId:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid dealerId,
        [FromBody] RejectRequest request,
        CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new RejectDealerCommand(dealerId, adminId, request.Reason), ct);
        return Ok(new { Message = "Dealer rejected." });
    }

    /// <summary>Suspend an active dealer with a reason (sends email notification).</summary>
    [HttpPut("{dealerId:guid}/suspend")]
    public async Task<IActionResult> Suspend(
        Guid dealerId,
        [FromBody] SuspendRequest request,
        CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new SuspendDealerCommand(dealerId, adminId, request.Reason), ct);
        return Ok(new { Message = "Dealer suspended and notification sent." });
    }

    /// <summary>Reactivate a suspended dealer.</summary>
    [HttpPut("{dealerId:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid dealerId, CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new ReactivateDealerCommand(dealerId, adminId), ct);
        return Ok(new { Message = "Dealer reactivated successfully." });
    }

    /// <summary>Delete a dealer permanently with a reason.</summary>
    [HttpDelete("{dealerId:guid}")]
    public async Task<IActionResult> Delete(
        Guid dealerId,
        [FromBody] DeleteRequest request,
        CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        await _mediator.Send(new DeleteDealerCommand(dealerId, adminId, request.Reason), ct);
        return Ok(new { Message = "Dealer deleted and notification sent." });
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}

public record RejectRequest(string Reason);
public record SuspendRequest(string Reason);
public record DeleteRequest(string Reason);
