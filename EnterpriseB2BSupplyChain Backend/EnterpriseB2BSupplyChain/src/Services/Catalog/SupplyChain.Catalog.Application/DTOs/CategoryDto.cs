namespace SupplyChain.Catalog.Application.DTOs;

public record CategoryDto(
    Guid CategoryId,
    string Name,
    string? Description,
    Guid? ParentCategoryId,
    bool IsActive
);
