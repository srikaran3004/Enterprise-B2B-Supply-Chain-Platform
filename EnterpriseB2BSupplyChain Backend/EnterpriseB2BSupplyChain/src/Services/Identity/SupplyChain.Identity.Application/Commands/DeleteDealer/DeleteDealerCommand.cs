using MediatR;

namespace SupplyChain.Identity.Application.Commands.DeleteDealer;

public record DeleteDealerCommand(Guid DealerId, Guid AdminId, string Reason) : IRequest;
