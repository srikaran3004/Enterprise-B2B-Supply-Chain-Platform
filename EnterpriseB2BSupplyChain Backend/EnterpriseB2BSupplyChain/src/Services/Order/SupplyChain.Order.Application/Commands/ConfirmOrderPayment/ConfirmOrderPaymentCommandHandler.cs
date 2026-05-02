using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.ConfirmOrderPayment;

public class ConfirmOrderPaymentCommandHandler : IRequestHandler<ConfirmOrderPaymentCommand>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IPaymentServiceClient _paymentServiceClient;
    private readonly IIdentityServiceClient _identityServiceClient;
    private readonly ILogger<ConfirmOrderPaymentCommandHandler> _logger;

    public ConfirmOrderPaymentCommandHandler(
        IOrderRepository orderRepository,
        IOutboxRepository outboxRepository,
        IPaymentServiceClient paymentServiceClient,
        IIdentityServiceClient identityServiceClient,
        ILogger<ConfirmOrderPaymentCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _outboxRepository = outboxRepository;
        _paymentServiceClient = paymentServiceClient;
        _identityServiceClient = identityServiceClient;
        _logger = logger;
    }

    public async Task Handle(ConfirmOrderPaymentCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Processing payment confirmation for OrderId={OrderId}, DealerId={DealerId}, Amount={Amount}",
            request.OrderId, request.DealerId, request.Amount);

        var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
        if (order is null)
        {
            _logger.LogError("Order not found: OrderId={OrderId}", request.OrderId);
            throw new DomainException("ORDER_NOT_FOUND", $"Order with ID {request.OrderId} was not found.");
        }

        if (order.PaymentStatus == PaymentStatus.Paid && order.Status != OrderStatus.PaymentPending)
        {
            _logger.LogWarning(
                "Payment already confirmed for OrderId={OrderId}. Current Status={Status}, PaymentStatus={PaymentStatus}. Skipping duplicate processing.",
                request.OrderId, order.Status, order.PaymentStatus);
            return;
        }

        var confirmed = await _orderRepository.TryConfirmPaymentAsync(request.OrderId, cancellationToken);
        if (!confirmed)
        {
            order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
            if (order?.PaymentStatus == PaymentStatus.Paid && order.Status != OrderStatus.PaymentPending)
            {
                _logger.LogWarning(
                    "Payment already confirmed for OrderId={OrderId}. Current Status={Status}, PaymentStatus={PaymentStatus}. Skipping duplicate processing.",
                    request.OrderId, order.Status, order.PaymentStatus);
                return;
            }

            throw new InvalidOperationException("Order payment confirmation failed due to concurrent update. Please retry.");
        }

        _logger.LogInformation(
            "Payment confirmed for OrderId={OrderId}. Status changed to Placed, PaymentStatus set to Paid.",
            request.OrderId);

        order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken)
            ?? throw new DomainException("ORDER_NOT_FOUND", $"Order with ID {request.OrderId} was not found.");

        var creditCheck = await _paymentServiceClient.CheckCreditAsync(order.DealerId, order.TotalAmount, cancellationToken);

        string eventType;
        var finalStatus = OrderStatus.Placed;
        if (!creditCheck.Approved)
        {
            var holdReason = $"Monthly Purchase Limit exceeded. Remaining limit: INR {creditCheck.AvailableLimit:N2}. Admin approval required.";
            var held = await _orderRepository.TryTransitionStatusAsync(
                order.OrderId,
                Guid.Empty,
                OrderStatus.Placed,
                OrderStatus.OnHold,
                holdReason,
                cancellationToken);

            if (!held)
                throw new InvalidOperationException("Order hold transition failed due to concurrent update. Please retry.");

            finalStatus = OrderStatus.OnHold;
            eventType = "QuotaExceededReview";
            _logger.LogWarning(
                "OrderId={OrderId} placed OnHold due to credit limit. Available: {AvailableLimit}, Required: {TotalAmount}",
                request.OrderId, creditCheck.AvailableLimit, order.TotalAmount);
        }
        else
        {
            var systemActorId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var transitioned = await _orderRepository.TryTransitionStatusAsync(
                order.OrderId,
                systemActorId,
                OrderStatus.Placed,
                OrderStatus.Processing,
                "Auto-approved: within monthly purchase limit",
                cancellationToken);

            if (!transitioned)
            {
                order = await _orderRepository.GetByIdAsync(order.OrderId, cancellationToken);
                if (order?.Status != OrderStatus.Processing)
                    throw new InvalidOperationException("Order auto-approval failed due to concurrent update. Please retry.");
            }

            finalStatus = OrderStatus.Processing;
            eventType = "OrderPlaced";
            _logger.LogInformation(
                "OrderId={OrderId} auto-approved to Processing. Credit check passed. Available: {AvailableLimit}, Used: {TotalAmount}",
                request.OrderId, creditCheck.AvailableLimit, order.TotalAmount);
        }

        var dealerContact = await _identityServiceClient.GetDealerContactAsync(order.DealerId, cancellationToken);
        var dealerEmail = string.IsNullOrWhiteSpace(order.DealerEmail) ? dealerContact?.Email : order.DealerEmail;
        var dealerName = string.IsNullOrWhiteSpace(order.DealerName) ? dealerContact?.FullName : order.DealerName;

        var eventPayload = JsonSerializer.Serialize(new
        {
            OrderId = order.OrderId,
            OrderNumber = order.OrderNumber,
            DealerId = order.DealerId,
            dealerEmail,
            dealerName,
            TotalAmount = order.TotalAmount,
            ShippingFee = order.ShippingFee,
            Status = finalStatus.ToString(),
            PaymentStatus = PaymentStatus.Paid.ToString(),
            PlacedAt = order.PlacedAt
        });

        var outbox = OutboxMessage.Create(eventType, eventPayload);

        await _outboxRepository.AddAsync(outbox, cancellationToken);
        await _orderRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Payment confirmation completed for OrderId={OrderId}. Final Status={Status}, PaymentStatus={PaymentStatus}, Event={EventType}",
            request.OrderId, finalStatus, PaymentStatus.Paid, eventType);
    }
}
