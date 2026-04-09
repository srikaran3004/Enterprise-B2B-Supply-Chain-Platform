using MediatR;

namespace SupplyChain.Catalog.Application.Commands.CreateCategory;

public record CreateCategoryCommand(
    string Name,
    string? Description,
    Guid? ParentCategoryId
) : IRequest<Guid>;
