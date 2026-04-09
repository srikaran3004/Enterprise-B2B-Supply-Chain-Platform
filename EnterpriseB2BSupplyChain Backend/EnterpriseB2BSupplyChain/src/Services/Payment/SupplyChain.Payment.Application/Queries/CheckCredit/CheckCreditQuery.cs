using MediatR;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.CheckCredit;

public record CheckCreditQuery(Guid DealerId, decimal Amount) : IRequest<CreditCheckDto>;
