using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Identity.Application.Commands.ShippingAddress;
using SupplyChain.Identity.Application.Queries.ShippingAddress;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/shipping-addresses")]
public class ShippingAddressController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShippingAddressController(IMediator mediator) => _mediator = mediator;

    private Guid GetDealerId()
    {
        var claim = User.FindFirst("dealerId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    [HttpGet]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> GetAddresses(CancellationToken ct)
    {
        var dealerId = GetDealerId();
        if (dealerId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetShippingAddressesQuery(dealerId), ct);
        return Ok(result);
    }

    [HttpGet("dealer/{dealerId:guid}")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> GetAddressesByDealerId(Guid dealerId, CancellationToken ct)
    {
        // Dealers can only read their own addresses; admins can read any dealer's addresses
        if (User.IsInRole("Dealer"))
        {
            var requestingDealerId = GetDealerId();
            if (requestingDealerId == Guid.Empty || requestingDealerId != dealerId)
                return Forbid();
        }

        var result = await _mediator.Send(new GetShippingAddressesQuery(dealerId), ct);
        return Ok(result);
    }

    /// <summary>
    /// Internal service-to-service endpoint secured with internal JWT policy.
    /// </summary>
    [HttpGet("internal/dealer/{dealerId:guid}")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> GetAddressesByDealerIdInternal(Guid dealerId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetShippingAddressesQuery(dealerId), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> AddAddress([FromBody] AddShippingAddressRequest request, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        if (dealerId == Guid.Empty) return Unauthorized();

        var cmd = new AddShippingAddressCommand(
            dealerId, request.Label, request.AddressLine1,
            request.District, request.City, request.State, request.PinCode,
            request.PhoneNumber, request.IsDefault);

        var id = await _mediator.Send(cmd, ct);
        return Ok(new { addressId = id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> UpdateAddress(Guid id, [FromBody] UpdateShippingAddressRequest request, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        if (dealerId == Guid.Empty) return Unauthorized();

        var cmd = new UpdateShippingAddressCommand(
            id, dealerId, request.Label, request.AddressLine1,
            request.District, request.City, request.State, request.PinCode,
            request.PhoneNumber);

        await _mediator.Send(cmd, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> DeleteAddress(Guid id, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        if (dealerId == Guid.Empty) return Unauthorized();

        await _mediator.Send(new DeleteShippingAddressCommand(id, dealerId), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/set-default")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> SetDefault(Guid id, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        if (dealerId == Guid.Empty) return Unauthorized();

        await _mediator.Send(new SetDefaultAddressCommand(id, dealerId), ct);
        return NoContent();
    }
}

public record AddShippingAddressRequest(
    string  Label,
    string  AddressLine1,
    string? District,
    string  City,
    string  State,
    string  PinCode,
    string? PhoneNumber,
    bool    IsDefault
);

public record UpdateShippingAddressRequest(
    string  Label,
    string  AddressLine1,
    string? District,
    string  City,
    string  State,
    string  PinCode,
    string? PhoneNumber
);

