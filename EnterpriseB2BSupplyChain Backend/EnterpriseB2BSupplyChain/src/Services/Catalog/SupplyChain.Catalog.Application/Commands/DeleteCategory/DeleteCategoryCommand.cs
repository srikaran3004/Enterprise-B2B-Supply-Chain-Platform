using MediatR;

namespace SupplyChain.Catalog.Application.Commands.DeleteCategory;

public record DeleteCategoryCommand(Guid CategoryId) : IRequest;
