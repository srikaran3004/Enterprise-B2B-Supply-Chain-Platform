using MediatR;

namespace SupplyChain.Identity.Application.Commands.RejectDealer;

public record RejectDealerCommand(Guid DealerId, Guid AdminId, string Reason) : IRequest;