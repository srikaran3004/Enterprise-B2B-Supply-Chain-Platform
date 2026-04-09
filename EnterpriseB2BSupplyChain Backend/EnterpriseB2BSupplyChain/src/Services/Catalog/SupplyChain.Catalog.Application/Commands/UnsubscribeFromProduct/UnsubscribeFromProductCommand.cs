using MediatR;

namespace SupplyChain.Catalog.Application.Commands.UnsubscribeFromProduct;

public record UnsubscribeFromProductCommand(Guid DealerId, Guid ProductId) : IRequest;
