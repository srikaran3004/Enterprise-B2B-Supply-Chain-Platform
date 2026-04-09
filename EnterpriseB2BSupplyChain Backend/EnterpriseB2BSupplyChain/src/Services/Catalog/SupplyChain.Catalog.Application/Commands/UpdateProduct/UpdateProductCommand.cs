using MediatR;

namespace SupplyChain.Catalog.Application.Commands.UpdateProduct;

public record UpdateProductCommand(
    Guid ProductId,
    string Name,
    string? Description,
    string? Brand,
    decimal UnitPrice,
    int MinOrderQuantity,
    string? ImageUrl,
    Guid? CategoryId = null
) : IRequest;
