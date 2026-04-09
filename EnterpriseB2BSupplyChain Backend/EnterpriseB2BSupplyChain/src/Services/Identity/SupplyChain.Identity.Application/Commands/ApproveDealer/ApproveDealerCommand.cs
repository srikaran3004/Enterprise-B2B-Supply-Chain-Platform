using MediatR;

namespace SupplyChain.Identity.Application.Commands.ApproveDealer;

public record ApproveDealerCommand(Guid DealerId, Guid AdminId) : IRequest;