using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Catalog.Application.Commands.CreateCategory;
using SupplyChain.Catalog.Application.Commands.DeleteCategory;
using SupplyChain.Catalog.Application.Commands.ToggleCategoryStatus;
using SupplyChain.Catalog.Application.Commands.UpdateCategory;
using SupplyChain.Catalog.Application.Queries.GetCategories;

namespace SupplyChain.Catalog.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CategoriesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetCategories(
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var canSeeInactive = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
        var categories = await _mediator.Send(new GetCategoriesQuery(includeInactive && canSeeInactive), ct);
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateCategoryCommand command,
        CancellationToken ct)
    {
        try
        {
            var categoryId = await _mediator.Send(command, ct);
            return CreatedAtAction(nameof(GetCategories), new { categoryId });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("{categoryId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateCategory(
        Guid categoryId,
        [FromBody] UpdateCategoryRequest request,
        CancellationToken ct)
    {
        try
        {
            await _mediator.Send(new UpdateCategoryCommand(categoryId, request.Name, request.Description), ct);
            return Ok(new { Message = "Category updated successfully." });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("{categoryId:guid}/activate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ActivateCategory(Guid categoryId, CancellationToken ct)
    {
        await _mediator.Send(new ToggleCategoryStatusCommand(categoryId, Activate: true), ct);
        return Ok(new { Message = "Category activated." });
    }

    [HttpPut("{categoryId:guid}/deactivate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeactivateCategory(Guid categoryId, CancellationToken ct)
    {
        await _mediator.Send(new ToggleCategoryStatusCommand(categoryId, Activate: false), ct);
        return Ok(new { Message = "Category deactivated." });
    }

    [HttpDelete("{categoryId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteCategory(
        Guid categoryId,
        CancellationToken ct)
    {
        try
        {
            await _mediator.Send(new DeleteCategoryCommand(categoryId), ct);
            return Ok(new { Message = "Category deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}

public record UpdateCategoryRequest(string Name, string? Description);
