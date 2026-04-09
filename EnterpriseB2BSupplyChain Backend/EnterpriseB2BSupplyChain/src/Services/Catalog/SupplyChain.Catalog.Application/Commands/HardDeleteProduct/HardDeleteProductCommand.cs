using MediatR;

namespace SupplyChain.Catalog.Application.Commands.HardDeleteProduct;

public record HardDeleteProductCommand(Guid ProductId) : IRequest;
