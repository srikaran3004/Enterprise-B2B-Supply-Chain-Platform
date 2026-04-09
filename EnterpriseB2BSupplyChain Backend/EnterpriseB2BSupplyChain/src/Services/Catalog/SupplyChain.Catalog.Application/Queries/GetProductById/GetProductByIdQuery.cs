using MediatR;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetProductById;

public record GetProductByIdQuery(Guid ProductId) : IRequest<ProductDetailDto>;
