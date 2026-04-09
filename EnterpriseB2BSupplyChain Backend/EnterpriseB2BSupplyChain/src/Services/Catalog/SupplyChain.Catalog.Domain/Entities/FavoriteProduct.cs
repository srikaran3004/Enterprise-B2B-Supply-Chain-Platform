namespace SupplyChain.Catalog.Domain.Entities;

public class FavoriteProduct
{
    public Guid FavoriteId { get; private set; }
    public Guid DealerId { get; private set; }
    public Guid ProductId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    // Navigation
    public Product? Product { get; private set; }

    private FavoriteProduct() { }

    public static FavoriteProduct Create(Guid dealerId, Guid productId)
    {
        return new FavoriteProduct
        {
            FavoriteId = Guid.NewGuid(),
            DealerId = dealerId,
            ProductId = productId,
            CreatedAt = DateTime.UtcNow
        };
    }
}
