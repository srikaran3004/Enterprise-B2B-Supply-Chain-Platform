using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Application.Commands.RaiseReturn;

public class RaiseReturnCommandHandler : IRequestHandler<RaiseReturnCommand>
{
    private readonly IOrderRepository  _orderRepository;
    private readonly IOutboxRepository _outboxRepository;

    public RaiseReturnCommandHandler(IOrderRepository orderRepository, IOutboxRepository outboxRepository)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
    }

    public async Task Handle(RaiseReturnCommand command, CancellationToken ct)
    {
        const int maxAttempts = 2;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var order = await _orderRepository.GetByIdAsync(command.OrderId, ct)
                ?? throw new KeyNotFoundException($"Order {command.OrderId} not found.");

            if (order.DealerId != command.DealerId)
                throw new UnauthorizedAccessException("You can only raise returns for your own orders.");

            order.RaiseReturnRequest(command.DealerId, command.Reason, command.PhotoUrl);

            var outbox = OutboxMessage.Create("ReturnRequested", JsonSerializer.Serialize(new
            {
                order.OrderId,
                order.OrderNumber,
                order.DealerId,
                Reason = command.Reason
            }));

            await _outboxRepository.AddAsync(outbox, ct);

            try
            {
                await _orderRepository.SaveChangesAsync(ct);
                return;
            }
            catch (Exception ex) when (IsDbConcurrencyException(ex) && attempt < maxAttempts)
            {
                // The order was updated concurrently. Reload and retry once.
            }
            catch (Exception ex) when (IsDbConcurrencyException(ex))
            {
                throw new InvalidOperationException("Order was updated by another operation. Please refresh and try return request again.");
            }
        }
    }

    private static bool IsDbConcurrencyException(Exception exception)
        => exception.GetType().FullName == "Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException";
}
