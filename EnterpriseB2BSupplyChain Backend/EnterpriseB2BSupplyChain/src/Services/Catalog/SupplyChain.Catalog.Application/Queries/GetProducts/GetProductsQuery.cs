using MediatR;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetProducts;

public record GetProductsQuery(
    Guid? CategoryId = null,
    bool? InStockOnly = null,
    string? SearchTerm = null,
    bool IncludeInactive = false
) : IRequest<List<ProductDto>>;