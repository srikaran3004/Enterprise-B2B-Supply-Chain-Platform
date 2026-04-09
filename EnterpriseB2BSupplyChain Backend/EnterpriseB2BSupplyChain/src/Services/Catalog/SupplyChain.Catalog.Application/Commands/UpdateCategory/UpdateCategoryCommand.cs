using MediatR;

namespace SupplyChain.Catalog.Application.Commands.UpdateCategory;

public record UpdateCategoryCommand(
    Guid CategoryId,
    string Name,
    string? Description
) : IRequest;
