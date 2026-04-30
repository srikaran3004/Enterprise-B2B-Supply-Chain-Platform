using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.ApproveOrder;

public class ApproveOrderCommandHandler : IRequestHandler<ApproveOrderCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public ApproveOrderCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(ApproveOrderCommand command, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (order.Status != OrderStatus.Placed && order.Status != OrderStatus.OnHold)
            throw new DomainException("INVALID_TRANSITION", "Only Placed or OnHold orders can be approved.");

        var wasOnHold = order.Status == OrderStatus.OnHold;

        var approved = await _orderRepository.TryApproveOrderAsync(
            command.OrderId,
            command.AdminId,
            order.Status.ToString(),
            ct);

        if (!approved)
            throw new InvalidOperationException("Order approval failed due to concurrent update. Please retry.");

        var outbox = OutboxMessage.Create("OrderApproved", JsonSerializer.Serialize(new
        {
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            ApprovedByAdminId = command.AdminId
        }));

        await _outboxRepository.AddAsync(outbox, ct);

        // Notify Dealer if their held payment is finally approved
        if (wasOnHold && order.PaymentStatus == PaymentStatus.Paid)
        {
            var placedOutbox = OutboxMessage.Create("OrderPlaced", JsonSerializer.Serialize(new
            {
                order.OrderId,
                order.OrderNumber,
                order.DealerId,
                order.DealerName,
                order.DealerEmail,
                TotalAmount = order.TotalAmount,
                PaymentMode = order.PaymentMode.ToString(),
                PaymentStatus = order.PaymentStatus.ToString()
            }));
            await _outboxRepository.AddAsync(placedOutbox, ct);
        }

        await _orderRepository.SaveChangesAsync(ct);
    }
}
