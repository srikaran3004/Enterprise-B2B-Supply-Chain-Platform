using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Application.Services;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Application.Commands.PlaceOrder;

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, PlaceOrderResult>
{
    private readonly IOrderRepository      _orderRepository;
    private readonly IInventoryServiceClient _inventoryClient;
    private readonly IIdentityServiceClient _identityClient;

    public PlaceOrderCommandHandler(
        IOrderRepository      orderRepository,
        IInventoryServiceClient inventoryClient,
        IIdentityServiceClient identityClient)
    {
        _orderRepository  = orderRepository;
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

        // Calculate subtotal
        var subtotal = command.Lines.Sum(l => l.UnitPrice * l.Quantity);
        var totalWithShipping = subtotal + shippingFee;

        // Unconditionally commit inventory to reserve it while payment is pending
        var inventoryCommitted = await _inventoryClient.CommitOrderInventoryAsync(
            command.DealerId,
            command.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList(),
            ct);

        if (!inventoryCommitted)
            throw new DomainException("INVENTORY_COMMIT_FAILED", "Unable to commit inventory for one or more products.");

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
        // FORCE all orders to start as PaymentPending
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
            dealerEmail: command.DealerEmail,
            initialStatus: OrderStatus.PaymentPending
        );

        try
        {
            await _orderRepository.AddAsync(order, ct);
            // CRITICAL: Do NOT publish OrderPlaced or any Outbox events here.
            // That will happen after payment is confirmed in ConfirmOrderPaymentCommandHandler.
            await _orderRepository.SaveChangesAsync(ct);
        }
        catch
        {
            // Roll back inventory if it was committed but save failed
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
