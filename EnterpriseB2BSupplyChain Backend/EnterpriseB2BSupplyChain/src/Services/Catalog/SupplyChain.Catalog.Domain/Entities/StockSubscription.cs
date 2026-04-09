using System;
using System.Collections.Generic;
using System.Text;

namespace SupplyChain.Catalog.Domain.Entities;

public class StockSubscription
{
    public Guid SubscriptionId { get; private set; }
    public Guid DealerId { get; private set; }
    public Guid ProductId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastNotifiedAt { get; private set; }

    // Navigation
    public Product Product { get; private set; } = null!;

    private StockSubscription() { }

    public static StockSubscription Create(Guid dealerId, Guid productId)
        => new()
        {
            SubscriptionId = Guid.NewGuid(),
            DealerId = dealerId,
            ProductId = productId,
            CreatedAt = DateTime.UtcNow
        };

    public void MarkNotified()
        => LastNotifiedAt = DateTime.UtcNow;
}
