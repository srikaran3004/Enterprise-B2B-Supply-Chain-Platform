using MediatR;

namespace SupplyChain.Identity.Application.Commands.ReactivateDealer;

public record ReactivateDealerCommand(Guid DealerId, Guid AdminId) : IRequest;
