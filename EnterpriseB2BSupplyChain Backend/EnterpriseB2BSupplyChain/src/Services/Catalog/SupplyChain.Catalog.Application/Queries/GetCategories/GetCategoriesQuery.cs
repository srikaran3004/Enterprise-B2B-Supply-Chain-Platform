using MediatR;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetCategories;

public record GetCategoriesQuery(bool IncludeInactive = false) : IRequest<List<CategoryDto>>;