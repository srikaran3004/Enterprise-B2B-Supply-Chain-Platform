using MediatR;

namespace SupplyChain.Order.Application.Commands.ConfirmOrderPayment;

public record ConfirmOrderPaymentCommand(Guid OrderId, Guid DealerId, decimal Amount) : IRequest;
