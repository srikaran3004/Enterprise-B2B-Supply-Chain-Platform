using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.CancelOrder;

public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IPaymentServiceClient _paymentServiceClient;
    private readonly IIdentityServiceClient _identityServiceClient;
    private readonly IInventoryServiceClient _inventoryServiceClient;
    private readonly ILogger<CancelOrderCommandHandler> _logger;

    public CancelOrderCommandHandler(
        IOrderRepository orderRepository,
        IOutboxRepository outboxRepository,
        IPaymentServiceClient paymentServiceClient,
        IIdentityServiceClient identityServiceClient,
        IInventoryServiceClient inventoryServiceClient,
        ILogger<CancelOrderCommandHandler> logger)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
        _paymentServiceClient = paymentServiceClient;
        _identityServiceClient = identityServiceClient;
        _inventoryServiceClient = inventoryServiceClient;
        _logger = logger;
    }

    public async Task Handle(CancelOrderCommand command, CancellationToken ct)
    {
        var reason = command.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("INVALID_REASON", "Cancellation reason is required.");

        var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
            ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

        if (command.DealerId.HasValue && order.DealerId != command.DealerId.Value)
            throw new UnauthorizedAccessException("You can only cancel your own orders.");

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

        var restored = await _inventoryServiceClient.RestoreOrderInventoryAsync(
            order.DealerId,
            order.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList(),
            ct);

        if (!restored)
        {
            _logger.LogWarning(
                "Order cancelled but inventory restore call failed for OrderId={OrderId}, DealerId={DealerId}",
                order.OrderId,
                order.DealerId);
        }

        if (string.Equals(order.PaymentMode, "Credit", StringComparison.OrdinalIgnoreCase))
        {
            var released = await _paymentServiceClient.ReleaseCreditAsync(
                order.OrderId,
                order.DealerId,
                order.TotalAmount,
                ct);

            if (!released)
            {
                _logger.LogWarning(
                    "Order cancelled but credit release call failed for OrderId={OrderId}, DealerId={DealerId}",
                    order.OrderId,
                    order.DealerId);
            }
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
            Reason = reason,
            dealerEmail
        }));


        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);
    }
}
