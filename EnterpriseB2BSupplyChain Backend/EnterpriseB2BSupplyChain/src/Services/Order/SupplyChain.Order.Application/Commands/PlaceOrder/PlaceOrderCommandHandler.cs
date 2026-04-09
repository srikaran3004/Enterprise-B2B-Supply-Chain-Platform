using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.Services;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Application.Commands.PlaceOrder;

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, PlaceOrderResult>
{
    private readonly IOrderRepository      _orderRepository;
    private readonly IOutboxRepository     _outboxRepository;
    private readonly IPaymentServiceClient _paymentClient;
    private readonly IIdentityServiceClient _identityClient;

    public PlaceOrderCommandHandler(
        IOrderRepository      orderRepository,
        IOutboxRepository     outboxRepository,
        IPaymentServiceClient paymentClient,
        IIdentityServiceClient identityClient)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
        _paymentClient    = paymentClient;
        _identityClient   = identityClient;
    }

    public async Task<PlaceOrderResult> Handle(PlaceOrderCommand command, CancellationToken ct)
    {
        // Fetch selected or default Shipping Address from Identity Service
        var shippingAddress = await _identityClient.GetShippingAddressAsync(
            command.DealerId, command.ShippingAddressId, ct);

        // Calculate state-based shipping fee
        var shippingFee = ShippingFeeService.Calculate(shippingAddress?.State);

        // Calculate subtotal for credit check (before shipping)
        var subtotal = command.Lines.Sum(l => l.UnitPrice * l.Quantity);

        // Credit check against Payment Service (subtotal + shipping)
        var totalWithShipping = subtotal + shippingFee;
        var creditCheck = await _paymentClient.CheckCreditAsync(command.DealerId, totalWithShipping, ct);

        // Generate a new OrderId upfront so Lines can reference it
        var orderId     = Guid.NewGuid();
        var orderNumber = await _orderRepository.GenerateOrderNumberAsync(ct);

        // Build OrderLines with snapshot pricing
        var lines = command.Lines.Select(l => OrderLine.Create(
            orderId:     orderId,
            productId:   l.ProductId,
            productName: l.ProductName,
            sku:         l.SKU,
            unitPrice:   l.UnitPrice,
            quantity:    l.Quantity
        )).ToList();

        // Create the Order aggregate (TotalAmount = subtotal + shippingFee)
        var order = Domain.Entities.Order.Create(
            orderId:     orderId,
            dealerId:    command.DealerId,
            orderNumber: orderNumber,
            paymentMode: command.PaymentMode,
            lines:       lines,
            shippingFee: shippingFee,
            notes:       command.Notes,
            shippingAddressLabel: shippingAddress?.Label,
            shippingAddressLine: shippingAddress?.AddressLine1,
            shippingCity: shippingAddress?.City,
            shippingState: shippingAddress?.State,
            shippingPinCode: shippingAddress?.PinCode,
            dealerName:  command.DealerName,
            dealerEmail: command.DealerEmail
        );

        // If credit check fails — put order on hold immediately
        if (!creditCheck.Approved)
            order.PlaceOnHold($"Order exceeds available credit. Available: ₹{creditCheck.AvailableCredit:N2}");

        await _orderRepository.AddAsync(order, ct);

        // Write Outbox event in same logical save — both persist together
        var eventPayload = JsonSerializer.Serialize(new
        {
            OrderId     = order.OrderId,
            OrderNumber = order.OrderNumber,
            DealerId    = order.DealerId,
            dealerEmail = command.DealerEmail,
            TotalAmount = order.TotalAmount,
            ShippingFee = shippingFee,
            Status      = order.Status.ToString(),
            PlacedAt    = order.PlacedAt
        });

        var eventType = creditCheck.Approved ? "OrderPlaced" : "AdminApprovalRequired";
        var outbox    = OutboxMessage.Create(eventType, eventPayload);

        await _outboxRepository.AddAsync(outbox, ct);
        await _orderRepository.SaveChangesAsync(ct);

        return new PlaceOrderResult(order.OrderId, order.OrderNumber, order.Status.ToString(), shippingFee);
    }
}
