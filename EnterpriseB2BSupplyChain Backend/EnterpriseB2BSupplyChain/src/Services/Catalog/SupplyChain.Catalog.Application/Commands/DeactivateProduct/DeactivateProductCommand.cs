using MediatR;

namespace SupplyChain.Catalog.Application.Commands.DeactivateProduct;

public record DeactivateProductCommand(Guid ProductId) : IRequest;
