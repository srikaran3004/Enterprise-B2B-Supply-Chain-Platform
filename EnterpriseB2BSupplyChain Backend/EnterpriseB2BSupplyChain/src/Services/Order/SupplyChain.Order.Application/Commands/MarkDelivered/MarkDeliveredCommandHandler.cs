using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.MarkDelivered;

public class MarkDeliveredCommandHandler : IRequestHandler<MarkDeliveredCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public MarkDeliveredCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(MarkDeliveredCommand command, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (order.Status != OrderStatus.InTransit)
            throw new DomainException("INVALID_TRANSITION", "Only InTransit orders can be marked Delivered.");

        var transitioned = await _orderRepository.TryTransitionStatusAsync(
            command.OrderId,
            command.ActorId,
            OrderStatus.InTransit,
            OrderStatus.Delivered,
            "Delivered to dealer",
            ct);

        if (!transitioned)
            throw new InvalidOperationException("Failed to mark order delivered due to concurrent update. Please retry.");

        // This event triggers invoice generation in Payment Service
        var outbox = OutboxMessage.Create("OrderDelivered", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            order.TotalAmount,
            DeliveredAt = DateTime.UtcNow
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);
    }
}
