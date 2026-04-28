using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using OrderDomainException = SupplyChain.Order.Domain.Exceptions.DomainException;
using OrderEntity = SupplyChain.Order.Domain.Entities.Order;

namespace SupplyChain.Identity.Tests;

public class OrderDomainTests
{
    [Test]
    public void Create_WithEmptyLines_ThrowsDomainException()
    {
        var ex = Assert.Throws<OrderDomainException>(() =>
            OrderEntity.Create(
                orderId: Guid.NewGuid(),
                dealerId: Guid.NewGuid(),
                orderNumber: "ORD-1001",
                paymentMode: "Credit",
                lines: new List<OrderLine>()));

        Assert.That(ex!.Code, Is.EqualTo("EMPTY_ORDER"));
    }

    [Test]
    public void Placed_ToOnHold_ToApproved_MovesToProcessing()
    {
        var dealerId = Guid.NewGuid();
        var order = CreateSampleOrder(dealerId);

        order.PlaceOnHold("Purchase limit exceeded");
        order.Approve(Guid.NewGuid());

        Assert.That(order.Status, Is.EqualTo(OrderStatus.Processing));
        Assert.That(order.StatusHistory.Count, Is.EqualTo(3));
    }

    [Test]
    public void MarkInTransit_WithoutReadyForDispatch_ThrowsDomainException()
    {
        var order = CreateSampleOrder(Guid.NewGuid());

        var ex = Assert.Throws<OrderDomainException>(() => order.MarkInTransit(Guid.NewGuid()));

        Assert.That(ex!.Code, Is.EqualTo("INVALID_TRANSITION"));
    }

    private static OrderEntity CreateSampleOrder(Guid dealerId)
    {
        var orderId = Guid.NewGuid();
        var line = OrderLine.Create(
            orderId: orderId,
            productId: Guid.NewGuid(),
            productName: "Detergent",
            sku: "DET-001",
            unitPrice: 120,
            quantity: 2);

        return OrderEntity.Create(
            orderId: orderId,
            dealerId: dealerId,
            orderNumber: "ORD-2001",
            paymentMode: "Credit",
            lines: new List<OrderLine> { line },
            shippingFee: 20);
    }
}
