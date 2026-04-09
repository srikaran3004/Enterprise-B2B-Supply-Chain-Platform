namespace SupplyChain.Catalog.Application.DTOs;

public record ProductDetailDto(
    Guid ProductId,
    string SKU,
    string Name,
    string? Description,
    string? Brand,
    Guid CategoryId,
    string CategoryName,
    decimal UnitPrice,
    int MinOrderQuantity,
    int TotalStock,
    int ReservedStock,
    int AvailableStock,
    bool IsInStock,
    string Status,
    string? ImageUrl,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
