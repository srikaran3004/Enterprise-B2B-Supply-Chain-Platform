namespace SupplyChain.Catalog.Application.DTOs;

public record ProductDto(
    Guid ProductId,
    Guid CategoryId,
    string SKU,
    string Name,
    string? Brand,
    string CategoryName,
    decimal UnitPrice,
    int MinOrderQuantity,
    int TotalStock,
    int ReservedStock,
    int AvailableStock,
    bool IsInStock,
    string Status,
    string? ImageUrl
);
