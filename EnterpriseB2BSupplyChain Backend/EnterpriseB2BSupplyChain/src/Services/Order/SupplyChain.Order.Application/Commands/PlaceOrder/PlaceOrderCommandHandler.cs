using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.Services;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.PlaceOrder;

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, PlaceOrderResult>
{
    private readonly IOrderRepository      _orderRepository;
    private readonly IOutboxRepository     _outboxRepository;
    private readonly IPaymentServiceClient _paymentClient;
    private readonly IInventoryServiceClient _inventoryClient;
    private readonly IIdentityServiceClient _identityClient;

    public PlaceOrderCommandHandler(
        IOrderRepository      orderRepository,
        IOutboxRepository     outboxRepository,
        IPaymentServiceClient paymentClient,
        IInventoryServiceClient inventoryClient,
        IIdentityServiceClient identityClient)
    {
        _orderRepository  = orderRepository;
        _outboxRepository = outboxRepository;
        _paymentClient    = paymentClient;
        _inventoryClient  = inventoryClient;
        _identityClient   = identityClient;
    }

    public async Task<PlaceOrderResult> Handle(PlaceOrderCommand command, CancellationToken ct)
    {
        // Fetch selected or default Shipping Address from Identity Service
        var shippingAddress = await _identityClient.GetShippingAddressAsync(
            command.DealerId, command.ShippingAddressId, ct);

        // Calculate state-based shipping fee
        var shippingFee = ShippingFeeService.Calculate(shippingAddress?.State);

        // Calculate subtotal for purchase limit check (before shipping)
        var subtotal = command.Lines.Sum(l => l.UnitPrice * l.Quantity);

        // Purchase limit check against Payment Service (subtotal + shipping)
        // MUST happen BEFORE inventory commit so we know if the order goes OnHold.
        var totalWithShipping = subtotal + shippingFee;
        var creditCheck = await _paymentClient.CheckCreditAsync(command.DealerId, totalWithShipping, ct);

        // Only commit inventory when purchase limit is approved (or payment mode is not Credit).
        // This avoids permanently reducing stock for orders that go OnHold and may be cancelled later.
        var inventoryCommitted = false;
        if (creditCheck.Approved)
        {
            inventoryCommitted = await _inventoryClient.CommitOrderInventoryAsync(
                command.DealerId,
                command.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList(),
                ct);

            if (!inventoryCommitted)
                throw new DomainException("INVENTORY_COMMIT_FAILED", "Unable to commit inventory for one or more products.");
        }

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

        // If purchase limit check fails — put order on hold (no inventory committed in this path)
        if (!creditCheck.Approved)
        {
            order.PlaceOnHold($"Purchase limit exceeded and waiting for admin approval. Remaining purchase limit: ₹{creditCheck.AvailableLimit:N2}");
        }
        else
        {
            // Within purchase limit: skip admin approval and move straight to fulfillment.
            order.AutoApproveForPurchaseLimit();
        }

        var creditReserved = false;
        try
        {
            if (creditCheck.Approved)
            {
                creditReserved = await _paymentClient.ReserveCreditAsync(order.OrderId, command.DealerId, totalWithShipping, ct);
                if (!creditReserved)
                    throw new DomainException("CREDIT_RESERVE_FAILED", "Unable to reserve monthly purchase limit for this order. Please try again.");
            }

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
        }
        catch
        {
            // Roll back credit reservation if it was done
            if (creditReserved)
                await _paymentClient.ReleaseCreditAsync(order.OrderId, command.DealerId, totalWithShipping, ct);

            // Roll back inventory if it was committed
            if (inventoryCommitted)
                await _inventoryClient.RestoreOrderInventoryAsync(
                    command.DealerId,
                    command.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList(),
                    ct);
            throw;
        }

        return new PlaceOrderResult(order.OrderId, order.OrderNumber, order.Status.ToString(), shippingFee);
    }
}
