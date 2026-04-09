using MediatR;

namespace SupplyChain.Payment.Application.Commands.CreateCreditAccount;

public record CreateCreditAccountCommand(Guid DealerId, decimal CreditLimit = 500_000m) : IRequest<Guid>;
