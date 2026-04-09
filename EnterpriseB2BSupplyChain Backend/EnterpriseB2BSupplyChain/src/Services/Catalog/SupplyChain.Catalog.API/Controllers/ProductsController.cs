using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Catalog.Application.Commands.ActivateProduct;
using SupplyChain.Catalog.Application.Commands.CreateProduct;
using SupplyChain.Catalog.Application.Commands.DeactivateProduct;
using SupplyChain.Catalog.Application.Commands.HardDeleteProduct;
using SupplyChain.Catalog.Application.Commands.SubscribeToProduct;
using SupplyChain.Catalog.Application.Commands.UnsubscribeFromProduct;
using SupplyChain.Catalog.Application.Commands.UpdateProduct;
using SupplyChain.Catalog.Application.Commands.ToggleFavorite;
using SupplyChain.Catalog.Application.Queries.GetProductById;
using SupplyChain.Catalog.Application.Queries.GetProducts;
using SupplyChain.Catalog.Application.Queries.GetFavorites;

namespace SupplyChain.Catalog.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] Guid? categoryId = null,
        [FromQuery] bool? inStockOnly = null,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        // Only Admin/SuperAdmin can request inactive products
        var canSeeInactive = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
        var products = await _mediator.Send(
            new GetProductsQuery(categoryId, inStockOnly, searchTerm, includeInactive && canSeeInactive), ct);
        return Ok(products);
    }

    [HttpGet("{productId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> GetProduct(Guid productId, CancellationToken ct)
    {
        var product = await _mediator.Send(new GetProductByIdQuery(productId), ct);
        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateProduct(
        [FromBody] CreateProductCommand command,
        CancellationToken ct)
    {
        var productId = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetProduct), new { productId }, new { productId });
    }

    [HttpPut("{productId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateProduct(
        Guid productId,
        [FromBody] UpdateProductRequest request,
        CancellationToken ct)
    {
        await _mediator.Send(new UpdateProductCommand(
            productId,
            request.Name,
            request.Description,
            request.Brand,
            request.UnitPrice,
            request.MinOrderQuantity,
            request.ImageUrl,
            request.CategoryId
        ), ct);
        return Ok(new { Message = "Product updated successfully." });
    }

    [HttpDelete("{productId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeactivateProduct(Guid productId, CancellationToken ct)
    {
        await _mediator.Send(new DeactivateProductCommand(productId), ct);
        return Ok(new { Message = "Product deactivated." });
    }

    [HttpDelete("{productId:guid}/hard-delete")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> HardDeleteProduct(Guid productId, CancellationToken ct)
    {
        await _mediator.Send(new HardDeleteProductCommand(productId), ct);
        return Ok(new { Message = "Product permanently deleted." });
    }

    [HttpPut("{productId:guid}/activate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ActivateProduct(Guid productId, CancellationToken ct)
    {
        await _mediator.Send(new ActivateProductCommand(productId), ct);
        return Ok(new { Message = "Product activated." });
    }

    [HttpPost("{productId:guid}/notify-me")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> Subscribe(Guid productId, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        await _mediator.Send(new SubscribeToProductCommand(dealerId, productId), ct);
        return Ok(new { Message = "You will be notified when this product is back in stock." });
    }

    [HttpDelete("{productId:guid}/notify-me")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> Unsubscribe(Guid productId, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        await _mediator.Send(new UnsubscribeFromProductCommand(dealerId, productId), ct);
        return Ok(new { Message = "Subscription removed." });
    }

    [HttpPost("{productId:guid}/favorite")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> ToggleFavorite(Guid productId, CancellationToken ct)
    {
        var dealerId = GetDealerId();
        var isFavorited = await _mediator.Send(new ToggleFavoriteCommand(dealerId, productId), ct);
        return Ok(new { isFavorited, message = isFavorited ? "Added to favorites" : "Removed from favorites" });
    }

    [HttpGet("favorites")]
    [Authorize(Roles = "Dealer")]
    public async Task<IActionResult> GetFavorites(CancellationToken ct)
    {
        var dealerId = GetDealerId();
        var favorites = await _mediator.Send(new GetFavoritesQuery(dealerId), ct);
        return Ok(favorites);
    }

    private Guid GetDealerId()
    {
        var dealerClaim = User.FindFirst("dealerId")?.Value;
        return Guid.TryParse(dealerClaim, out var id) ? id : Guid.Empty;
    }
}

public record UpdateProductRequest(
    string Name,
    string? Description,
    string? Brand,
    decimal UnitPrice,
    int MinOrderQuantity,
    string? ImageUrl,
    Guid? CategoryId = null
);
