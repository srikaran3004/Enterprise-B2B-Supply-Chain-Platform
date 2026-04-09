using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Identity.Application.Queries.GetUserContact;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/internal/users")]
public class InternalUsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public InternalUsersController(IMediator mediator)
        => _mediator = mediator;

    [AllowAnonymous]
    [HttpGet("{userId:guid}/contact")]
    public async Task<IActionResult> GetUserContact(Guid userId, CancellationToken ct)
    {
        try
        {
            var contact = await _mediator.Send(new GetUserContactQuery(userId), ct);
            return Ok(contact);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"User {userId} not found." });
        }
    }
}
