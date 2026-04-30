using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.ConfirmOrderPayment;

public class ConfirmOrderPaymentCommandHandler : IRequestHandler<ConfirmOrderPaymentCommand>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public ConfirmOrderPaymentCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(ConfirmOrderPaymentCommand request, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
        if (order is null)
        {
            throw new DomainException("ORDER_NOT_FOUND", $"Order with ID {request.OrderId} was not found.");
        }

        order.ConfirmPayment();

        var eventPayload = JsonSerializer.Serialize(new
        {
            OrderId     = order.OrderId,
            OrderNumber = order.OrderNumber,
            DealerId    = order.DealerId,
            dealerEmail = order.DealerEmail,
            TotalAmount = order.TotalAmount,
            ShippingFee = order.ShippingFee,
            Status      = order.Status.ToString(),
            PlacedAt    = order.PlacedAt
        });

        var outbox = OutboxMessage.Create("OrderPlaced", eventPayload);

        await _outboxRepository.AddAsync(outbox, cancellationToken);
        await _orderRepository.SaveChangesAsync(cancellationToken);
    }
}
