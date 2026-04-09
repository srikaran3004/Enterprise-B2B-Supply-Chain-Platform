using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.CancelOrder;

public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IIdentityServiceClient _identityServiceClient;

    public CancelOrderCommandHandler(
        IOrderRepository orderRepository,
        IOutboxRepository outboxRepository,
        IIdentityServiceClient identityServiceClient)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
        _identityServiceClient = identityServiceClient;
    }

    public async Task Handle(CancelOrderCommand command, CancellationToken ct)
    {
        var reason = command.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("INVALID_REASON", "Cancellation reason is required.");

        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        var cancelled = await _orderRepository.TryCancelOrderAsync(
            command.OrderId,
            command.ActorId,
            order.Status.ToString(),
            reason,
            ct);

        if (!cancelled)
        {
            var latestOrder = await _orderRepository.GetByIdAsync(command.OrderId, ct);
            if (latestOrder is null)
                throw new KeyNotFoundException($"Order {command.OrderId} not found.");

            throw new DomainException(
                "INVALID_TRANSITION",
                $"Order {latestOrder.OrderNumber} can no longer be cancelled because it is currently {latestOrder.Status}.");
        }

        var dealerContact = string.IsNullOrWhiteSpace(command.DealerEmail)
            ? await _identityServiceClient.GetDealerContactAsync(order.DealerId, ct)
            : null;
        var dealerEmail = command.DealerEmail ?? dealerContact?.Email;

        var outbox = OutboxMessage.Create("OrderCancelled", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            order_number = order.OrderNumber,
            Reason = reason,
            reason,
            dealerEmail
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);
    }
}
