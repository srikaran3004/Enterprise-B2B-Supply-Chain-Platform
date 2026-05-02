using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Application.Commands.RaiseReturn;

public class RaiseReturnCommandHandler : IRequestHandler<RaiseReturnCommand>
{
    private static readonly TimeSpan ReturnWindow = TimeSpan.FromHours(48);

    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public RaiseReturnCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(RaiseReturnCommand command, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (order.DealerId != command.DealerId)
            throw new UnauthorizedAccessException("You can only raise returns for your own orders.");

        if (order.ReturnRequest is not null)
            return;

        if (order.Status == Domain.Enums.OrderStatus.ReturnRequested)
            return;

        if (order.Status != Domain.Enums.OrderStatus.Delivered)
            throw new InvalidOperationException($"Returns can only be raised on delivered orders. Current status: {order.Status}.");

        var deliveredAt = order.StatusHistory
            .Where(h => string.Equals(h.ToStatus, Domain.Enums.OrderStatus.Delivered.ToString(), StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => (DateTime?)h.ChangedAt)
            .FirstOrDefault();

        if (!deliveredAt.HasValue)
            throw new InvalidOperationException("Return cannot be raised because delivery timestamp was not found.");

        var elapsedSinceDelivery = DateTime.UtcNow - deliveredAt.Value;
        if (elapsedSinceDelivery > ReturnWindow)
            throw new InvalidOperationException("Return request window has expired. Returns must be raised within 48 hours of delivery.");

        var outbox = OutboxMessage.Create("ReturnRequested", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            Reason = command.Reason,
            PhotoUrl = command.PhotoUrl,
            ThumbUrl = command.ThumbUrl
        }));

        await _outboxRepository.AddAsync(outbox, ct);

        var raised = await _orderRepository.TryRaiseReturnAsync(
            command.OrderId,
            command.DealerId,
            command.Reason,
            command.PhotoUrl,
            command.ThumbUrl,
            ct);

        if (raised)
            return;

        var latestOrder = await _orderRepository.GetByIdAsync(command.OrderId, ct);
        if (latestOrder?.ReturnRequest is not null || latestOrder?.Status == Domain.Enums.OrderStatus.ReturnRequested)
            return;

        if (latestOrder is not null && latestOrder.Status != Domain.Enums.OrderStatus.Delivered)
            throw new InvalidOperationException($"Returns can only be raised on delivered orders. Current status: {latestOrder.Status}.");

        throw new InvalidOperationException("Order was updated by another operation. Please refresh and try return request again.");
    }
}
