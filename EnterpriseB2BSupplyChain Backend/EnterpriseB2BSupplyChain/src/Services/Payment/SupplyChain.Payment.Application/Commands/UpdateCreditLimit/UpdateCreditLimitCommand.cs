using MediatR;

namespace SupplyChain.Payment.Application.Commands.UpdateCreditLimit;

public record UpdateCreditLimitCommand(Guid DealerId, decimal NewLimit) : IRequest;
