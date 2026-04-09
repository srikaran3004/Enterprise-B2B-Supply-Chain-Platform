using MediatR;

namespace SupplyChain.Catalog.Application.Commands.CreateProduct;

public record CreateProductCommand(
    string SKU,
    string Name,
    string? Description,
    string? Brand,
    Guid CategoryId,
    decimal UnitPrice,
    int MinOrderQuantity,
    int InitialStock,
    string? ImageUrl
) : IRequest<Guid>;
