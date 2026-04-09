using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Application.Commands.AssignAgent;
using SupplyChain.Logistics.Application.Commands.CreateAgent;
using SupplyChain.Logistics.Application.Commands.CreateShipment;
using SupplyChain.Logistics.Application.Commands.CreateVehicle;
using SupplyChain.Logistics.Application.Commands.RateShipment;
using SupplyChain.Logistics.Application.Commands.UpdateShipmentStatus;
using SupplyChain.Logistics.Application.Queries.GetAllAgents;
using SupplyChain.Logistics.Application.Queries.GetAllShipments;
using SupplyChain.Logistics.Application.Queries.GetAvailableAgents;
using SupplyChain.Logistics.Application.Queries.GetMyShipments;
using SupplyChain.Logistics.Application.Queries.GetPendingShipments;
using SupplyChain.Logistics.Application.Queries.GetTracking;
using SupplyChain.Logistics.Domain.Enums;

namespace SupplyChain.Logistics.API.Controllers;

[ApiController]
[Route("api/logistics")]
[Authorize]
public class LogisticsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAgentRepository _agentRepository;

    public LogisticsController(IMediator mediator, IAgentRepository agentRepository)
    {
        _mediator = mediator;
        _agentRepository = agentRepository;
    }

    /// <summary>Create a shipment for an order (called when order is ReadyForDispatch).</summary>
    [HttpPost("shipments")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateShipment(
        [FromBody] CreateShipmentCommand command,
        CancellationToken ct)
    {
        var shipmentId = await _mediator.Send(command, ct);
        return Ok(new { shipmentId });
    }

    /// <summary>Get all active shipments (Pending through OutForDelivery — excludes Delivered/Failed).</summary>
    [HttpGet("shipments/pending")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetPendingShipments(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPendingShipmentsQuery(), ct);
        return Ok(result);
    }

    /// <summary>Get all shipments including delivered history.</summary>
    [HttpGet("shipments")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAllShipments(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllShipmentsQuery(), ct);
        return Ok(result);
    }

    /// <summary>Assign delivery agent and vehicle to a shipment.</summary>
    [HttpPost("shipments/assign-agent")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> AssignAgent(
        [FromBody] AssignAgentCommand command,
        CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return Ok(result);
    }

    /// <summary>Update delivery status and GPS location.</summary>
    [HttpPut("shipments/{orderId:guid}/status")]
    [Authorize(Roles = "DeliveryAgent")]
    public async Task<IActionResult> UpdateStatus(
        Guid orderId,
        [FromBody] UpdateStatusRequest request,
        CancellationToken ct)
    {
        if (!Enum.TryParse<ShipmentStatus>(request.Status, true, out var status))
            return BadRequest(new { error = "Invalid status value." });

        var agentId = GetCurrentUserId();

        await _mediator.Send(new UpdateShipmentStatusCommand(
            orderId, agentId, status,
            request.Latitude, request.Longitude, request.Notes, request.Place), ct);

        return Ok(new { Message = "Status updated." });
    }

    /// <summary>Get live tracking for an order.</summary>
    [HttpGet("tracking/{orderId:guid}")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin,DeliveryAgent")]
    public async Task<IActionResult> GetTracking(Guid orderId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetTrackingQuery(orderId), ct);
        if (result is null)
            return NoContent(); // 204: order placed but not yet dispatched
        return Ok(result);
    }

    /// <summary>Get all shipments assigned to the calling delivery agent.</summary>
    [HttpGet("shipments/mine")]
    [Authorize(Roles = "DeliveryAgent")]
    public async Task<IActionResult> GetMyShipments(CancellationToken ct)
    {
        var agentUserId = GetCurrentUserId();
        var result = await _mediator.Send(new GetMyShipmentsQuery(agentUserId), ct);
        return Ok(result);
    }

    /// <summary>Get the calling delivery agent's own profile.</summary>
    [HttpGet("agents/me")]
    [Authorize(Roles = "DeliveryAgent")]
    public async Task<IActionResult> GetMyAgentProfile(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var agents = await _agentRepository.GetAllAsync(ct);
        var agent  = agents.FirstOrDefault(a => a.UserId == userId);
        if (agent is null) return NotFound(new { error = "Agent profile not found." });
        return Ok(new
        {
            agent.AgentId, agent.FullName, agent.Phone,
            Status         = agent.Status.ToString(),
            agent.CurrentOrderId, agent.ServiceRegion,
            agent.AverageRating, agent.TotalDeliveries,
            agent.LicenseNumber
        });
    }

    /// <summary>Get all delivery agents (all statuses) for admin portal.</summary>
    [HttpGet("agents")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAllAgents(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllAgentsQuery(), ct);
        return Ok(result);
    }

    /// <summary>Get all available delivery agents. Optionally filter by region.</summary>
    [HttpGet("agents/available")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAvailableAgents(
        [FromQuery] string? region,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAvailableAgentsQuery(region), ct);
        return Ok(result);
    }

    /// <summary>Register a new delivery agent.</summary>
    [HttpPost("agents")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateAgent(
        [FromBody] CreateAgentCommand command,
        CancellationToken ct)
    {
        var agentId = await _mediator.Send(command, ct);
        return Ok(new { agentId });
    }

    /// <summary>Register a new vehicle.</summary>
    [HttpPost("vehicles")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateVehicle(
        [FromBody] CreateVehicleCommand command,
        CancellationToken ct)
    {
        var vehicleId = await _mediator.Send(command, ct);
        return Ok(new { vehicleId });
    }

    /// <summary>Get all vehicles.</summary>
    [HttpGet("vehicles")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetVehicles(CancellationToken ct)
    {
        var vehicles = await _agentRepository.GetAllVehiclesAsync(ct);
        return Ok(vehicles.Select(v => new
        {
            v.VehicleId,
            v.RegistrationNo,
            v.VehicleType,
            v.CapacityKg,
            Status = v.Status.ToString(),
            v.AssignedAgentId
        }));
    }

    /// <summary>Rate a delivered shipment.</summary>
    [HttpPost("shipments/{id:guid}/rate")]
    [Authorize]
    public async Task<IActionResult> RateShipment(
        Guid id,
        [FromBody] RateShipmentRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RateShipmentCommand(id, request.Rating, request.Feedback), ct);
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}

public record UpdateStatusRequest(
    string   Status,
    decimal? Latitude  = null,
    decimal? Longitude = null,
    string?  Notes     = null,
    string?  Place     = null
);

public record RateShipmentRequest(
    int     Rating,
    string? Feedback = null
);

