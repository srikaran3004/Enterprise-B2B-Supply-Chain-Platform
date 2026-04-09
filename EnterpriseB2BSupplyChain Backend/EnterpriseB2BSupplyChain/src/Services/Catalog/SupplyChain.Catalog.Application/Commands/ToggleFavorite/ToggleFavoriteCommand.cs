using MediatR;

namespace SupplyChain.Catalog.Application.Commands.ToggleFavorite;

public record ToggleFavoriteCommand(Guid DealerId, Guid ProductId) : IRequest<bool>;
