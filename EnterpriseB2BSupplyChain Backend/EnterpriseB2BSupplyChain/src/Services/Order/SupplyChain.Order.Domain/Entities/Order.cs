using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Domain.Exceptions;

namespace SupplyChain.Order.Domain.Entities;

public class Order
{
    public Guid        OrderId      { get; private set; }
    public string      OrderNumber  { get; private set; } = string.Empty;
    public Guid        DealerId     { get; private set; }
    public string?     DealerName   { get; private set; }
    public string?     DealerEmail  { get; private set; }
    public OrderStatus Status       { get; private set; }
    public decimal     TotalAmount  { get; private set; }
    public string      PaymentMode  { get; private set; } = string.Empty;
    public PaymentStatus PaymentStatus { get; private set; }
    public string?     Notes        { get; private set; }
    public string?     CancellationReason { get; private set; }
    public DateTime    PlacedAt     { get; private set; }
    public DateTime?   UpdatedAt    { get; private set; }
    public DateTime?   ClosedAt     { get; private set; }
    public byte[]      RowVersion   { get; private set; } = Array.Empty<byte>();

    // Shipping Address Snapshot
    public string? ShippingAddressLabel   { get; private set; }
    public string? ShippingAddressLine    { get; private set; }
    public string? ShippingCity           { get; private set; }
    public string? ShippingState          { get; private set; }
    public string? ShippingPinCode        { get; private set; }

    // Navigation
    public ICollection<OrderLine>          Lines         { get; private set; } = new List<OrderLine>();
    public ICollection<OrderStatusHistory> StatusHistory { get; private set; } = new List<OrderStatusHistory>();
    public ReturnRequest?                  ReturnRequest { get; private set; }

    private Order() { }

    public decimal     ShippingFee  { get; private set; }

    public static Order Create(
        Guid                  orderId,
        Guid                  dealerId,
        string                orderNumber,
        string                paymentMode,
        List<OrderLine>       lines,
        decimal               shippingFee = 0m,
        string?               notes = null,
        string?               shippingAddressLabel = null,
        string?               shippingAddressLine = null,
        string?               shippingCity = null,
        string?               shippingState = null,
        string?               shippingPinCode = null,
        string?               dealerName = null,
        string?               dealerEmail = null,
        OrderStatus           initialStatus = OrderStatus.Placed)
    {
        if (!lines.Any())
            throw new DomainException("EMPTY_ORDER", "Order must have at least one line item.");

        var totalAmount = lines.Sum(l => l.LineTotal) + shippingFee;

        var order = new Order
        {
            OrderId     = orderId,
            OrderNumber = orderNumber,
            DealerId    = dealerId,
            DealerName  = dealerName,
            DealerEmail = dealerEmail,
            Status      = initialStatus,
            PaymentStatus = PaymentStatus.Pending,
            TotalAmount = totalAmount,
            ShippingFee = shippingFee,
            PaymentMode = paymentMode,
            Notes       = notes,
            PlacedAt    = DateTime.UtcNow,
            ShippingAddressLabel = shippingAddressLabel,
            ShippingAddressLine = shippingAddressLine,
            ShippingCity = shippingCity,
            ShippingState = shippingState,
            ShippingPinCode = shippingPinCode
        };

        foreach (var line in lines)
            order.Lines.Add(line);

        order.StatusHistory.Add(OrderStatusHistory.Create(
            order.OrderId, "None", initialStatus.ToString(), dealerId, "Order placed by dealer"));

        return order;
    }

    // ── Status Transitions ────────────────────────────────────────

    public void ConfirmPayment()
    {
        if (Status != OrderStatus.PaymentPending)
            throw new DomainException("INVALID_TRANSITION", "Only PaymentPending orders can have their payment confirmed.");

        RecordTransition(Status, OrderStatus.Placed, null, "Payment successfully confirmed");
        Status = OrderStatus.Placed;
        PaymentStatus = PaymentStatus.Paid;
        UpdatedAt = DateTime.UtcNow;
    }

    public void PlaceOnHold(string reason)
    {
        if (Status != OrderStatus.Placed)
            throw new DomainException("INVALID_TRANSITION", "Only Placed orders can be put OnHold.");

        RecordTransition(Status, OrderStatus.OnHold, null, reason);
        Status    = OrderStatus.OnHold;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Approve(Guid adminId)
    {
        if (Status != OrderStatus.OnHold && Status != OrderStatus.Placed)
            throw new DomainException("INVALID_TRANSITION", "Only Placed or OnHold orders can be approved.");

        RecordTransition(Status, OrderStatus.Processing, adminId, "Approved by Admin");
        Status    = OrderStatus.Processing;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AutoApproveForPurchaseLimit()
    {
        if (Status != OrderStatus.Placed)
            throw new DomainException("INVALID_TRANSITION", "Only Placed orders can be auto-approved.");

        RecordTransition(Status, OrderStatus.Processing, null, "Auto-approved: within monthly purchase limit");
        Status = OrderStatus.Processing;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReadyForDispatch(Guid warehouseManagerId)
    {
        if (Status != OrderStatus.Processing)
            throw new DomainException("INVALID_TRANSITION", "Only Processing orders can be marked Ready for Dispatch.");

        RecordTransition(Status, OrderStatus.ReadyForDispatch, warehouseManagerId, "Packed and ready");
        Status    = OrderStatus.ReadyForDispatch;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkInTransit(Guid actorId)
    {
        if (Status != OrderStatus.ReadyForDispatch)
            throw new DomainException("INVALID_TRANSITION", "Only ReadyForDispatch orders can be marked InTransit.");

        RecordTransition(Status, OrderStatus.InTransit, actorId, "Picked up by delivery agent");
        Status    = OrderStatus.InTransit;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkDelivered(Guid actorId)
    {
        if (Status != OrderStatus.InTransit)
            throw new DomainException("INVALID_TRANSITION", "Only InTransit orders can be marked Delivered.");

        RecordTransition(Status, OrderStatus.Delivered, actorId, "Delivered to dealer");
        Status    = OrderStatus.Delivered;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close(Guid actorId)
    {
        if (Status != OrderStatus.Delivered)
            throw new DomainException("INVALID_TRANSITION", "Only Delivered orders can be closed.");

        RecordTransition(Status, OrderStatus.Closed, actorId, "Order closed after delivery confirmation");
        Status   = OrderStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(Guid actorId, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("INVALID_REASON", "Cancellation reason is required.");

        var cancellableStatuses = new[]
        {
            OrderStatus.Placed,
            OrderStatus.OnHold,
            OrderStatus.Processing
        };

        if (!cancellableStatuses.Contains(Status))
            throw new DomainException("INVALID_TRANSITION",
                "Orders in transit or delivered cannot be cancelled.");

        var trimmedReason = reason.Trim();
        RecordTransition(Status, OrderStatus.Cancelled, actorId, trimmedReason);
        Status    = OrderStatus.Cancelled;
        CancellationReason = trimmedReason;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RaiseReturnRequest(Guid dealerId, string reason, string? photoUrl = null)
    {
        if (Status != OrderStatus.Delivered)
            throw new DomainException("INVALID_RETURN", "Returns can only be raised on Delivered orders.");

        if (ReturnRequest is not null)
            throw new DomainException("DUPLICATE_RETURN", "A return request already exists for this order.");

        ReturnRequest = ReturnRequest.Create(OrderId, dealerId, reason, photoUrl);

        RecordTransition(Status, OrderStatus.ReturnRequested, dealerId, reason);
        Status    = OrderStatus.ReturnRequested;
        UpdatedAt = DateTime.UtcNow;
    }

    private void RecordTransition(
        OrderStatus fromStatus,
        OrderStatus toStatus,
        Guid?       actorId,
        string?     notes)
    {
        StatusHistory.Add(OrderStatusHistory.Create(
            OrderId,
            fromStatus.ToString(),
            toStatus.ToString(),
            actorId,
            notes));
    }
}
