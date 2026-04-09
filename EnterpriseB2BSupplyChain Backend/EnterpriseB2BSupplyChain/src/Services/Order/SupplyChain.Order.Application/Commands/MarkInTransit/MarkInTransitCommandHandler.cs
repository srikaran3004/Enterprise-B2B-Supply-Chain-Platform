using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.MarkInTransit;

public class MarkInTransitCommandHandler : IRequestHandler<MarkInTransitCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public MarkInTransitCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(MarkInTransitCommand command, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (order.Status != OrderStatus.ReadyForDispatch)
            throw new DomainException("INVALID_TRANSITION", "Only ReadyForDispatch orders can be marked InTransit.");

        var transitioned = await _orderRepository.TryTransitionStatusAsync(
            command.OrderId,
            command.ActorId,
            OrderStatus.ReadyForDispatch,
            OrderStatus.InTransit,
            "Picked up by delivery agent",
            ct);

        if (!transitioned)
            throw new InvalidOperationException("Failed to mark order in transit due to concurrent update. Please retry.");

        var outbox = OutboxMessage.Create("OrderInTransit", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);
    }
}
