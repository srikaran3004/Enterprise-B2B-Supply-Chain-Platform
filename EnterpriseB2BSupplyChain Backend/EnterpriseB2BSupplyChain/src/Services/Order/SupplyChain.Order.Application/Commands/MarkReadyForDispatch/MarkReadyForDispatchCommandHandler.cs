using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.MarkReadyForDispatch;

public class MarkReadyForDispatchCommandHandler : IRequestHandler<MarkReadyForDispatchCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public MarkReadyForDispatchCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(MarkReadyForDispatchCommand command, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (order.Status != OrderStatus.Processing)
            throw new DomainException("INVALID_TRANSITION", "Only Processing orders can be marked Ready for Dispatch.");

        var transitioned = await _orderRepository.TryTransitionStatusAsync(
            command.OrderId,
            command.WarehouseManagerId,
            OrderStatus.Processing,
            OrderStatus.ReadyForDispatch,
            "Packed and ready",
            ct);

        if (!transitioned)
            throw new InvalidOperationException("Failed to mark order ready for dispatch due to concurrent update. Please retry.");

        // This event triggers the Dispatch Saga in the Logistics Service
        var outbox = OutboxMessage.Create("OrderReadyForDispatch", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            order.TotalAmount,
            Lines = order.Lines.Select(l => new
            {
                l.ProductId,
                l.Quantity
            })
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);
    }
}
