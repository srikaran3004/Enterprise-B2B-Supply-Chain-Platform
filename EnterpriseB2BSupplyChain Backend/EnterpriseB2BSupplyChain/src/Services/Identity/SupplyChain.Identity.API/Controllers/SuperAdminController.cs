using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Identity.Application.Commands.CreateStaffUser;
using SupplyChain.Identity.Application.Queries.GetAdminList;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/super-admin")]
[Authorize(Roles = "SuperAdmin")]
public class SuperAdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public SuperAdminController(IMediator mediator)
        => _mediator = mediator;

    [HttpPost("create-admin")]
    public async Task<IActionResult> CreateAdmin(
        [FromBody] CreateStaffUserCommand command,
        CancellationToken ct)
    {
        var userId = await _mediator.Send(command, ct);
        return Ok(new { userId, Message = "Staff user created successfully." });
    }

    [HttpGet("view-admins")]
    public async Task<IActionResult> ViewAdmins(CancellationToken ct)
    {
        var admins = await _mediator.Send(new GetAdminListQuery(), ct);
        return Ok(admins);
    }
}
