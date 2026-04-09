using MediatR;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetFavorites;

public record GetFavoritesQuery(Guid DealerId) : IRequest<List<ProductDto>>;
