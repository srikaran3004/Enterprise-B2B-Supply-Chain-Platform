using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Identity.Application.Queries.GetDealerContact;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/internal/dealers")]
public class InternalDealersController : ControllerBase
{
    private readonly IMediator _mediator;

    public InternalDealersController(IMediator mediator)
        => _mediator = mediator;

    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    [HttpGet("{dealerId:guid}/contact")]
    public async Task<IActionResult> GetDealerContact(Guid dealerId, CancellationToken ct)
    {
        var contact = await _mediator.Send(new GetDealerContactQuery(dealerId), ct);
        return Ok(contact);
    }
}

