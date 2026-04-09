using MediatR;

namespace SupplyChain.Identity.Application.Commands.SuspendDealer;

public record SuspendDealerCommand(Guid DealerId, Guid AdminId, string Reason) : IRequest;
