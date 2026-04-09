using MediatR;

namespace SupplyChain.Catalog.Application.Commands.ActivateProduct;

public record ActivateProductCommand(Guid ProductId) : IRequest;
