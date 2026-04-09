using MediatR;

namespace SupplyChain.Catalog.Application.Commands.SubscribeToProduct;

public record SubscribeToProductCommand(Guid DealerId, Guid ProductId) : IRequest;
