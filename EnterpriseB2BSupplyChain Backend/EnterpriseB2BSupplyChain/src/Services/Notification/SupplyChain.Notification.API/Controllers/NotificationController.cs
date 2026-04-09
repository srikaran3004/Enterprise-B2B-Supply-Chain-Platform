using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SupplyChain.Notification.Application.Commands;
using SupplyChain.Notification.Application.Queries;

namespace SupplyChain.Notification.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationController(IMediator mediator) => _mediator = mediator;

    [HttpGet("inbox")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> GetInbox(CancellationToken ct)
    {
        var ownerId = GetInboxOwnerId();
        if (ownerId == Guid.Empty)
            return Unauthorized(new { Message = "Unable to resolve notification owner." });

        var inbox = await _mediator.Send(new GetMyInboxQuery(ownerId), ct);
        return Ok(inbox);
    }

    [HttpGet("inbox/unread-count")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        var ownerId = GetInboxOwnerId();
        if (ownerId == Guid.Empty)
            return Unauthorized(new { Message = "Unable to resolve notification owner." });

        var count = await _mediator.Send(new GetUnreadCountQuery(ownerId), ct);
        return Ok(new { Count = count });
    }

    [HttpPut("inbox/{notificationId:guid}/read")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId, CancellationToken ct)
    {
        var ownerId = GetInboxOwnerId();
        if (ownerId == Guid.Empty)
            return Unauthorized(new { Message = "Unable to resolve notification owner." });

        await _mediator.Send(new MarkNotificationReadCommand(notificationId, ownerId), ct);
        return Ok(new { Message = "Marked as read." });
    }

    [HttpPut("inbox/read-all")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
    {
        var ownerId = GetInboxOwnerId();
        if (ownerId == Guid.Empty)
            return Unauthorized(new { Message = "Unable to resolve notification owner." });

        await _mediator.Send(new MarkAllNotificationsReadCommand(ownerId), ct);
        return Ok(new { Message = "All marked as read." });
    }

    private Guid GetInboxOwnerId()
    {
        var dealerClaim = User.FindFirst("dealerId")?.Value;
        if (Guid.TryParse(dealerClaim, out var dealerId) && dealerId != Guid.Empty)
            return dealerId;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}
