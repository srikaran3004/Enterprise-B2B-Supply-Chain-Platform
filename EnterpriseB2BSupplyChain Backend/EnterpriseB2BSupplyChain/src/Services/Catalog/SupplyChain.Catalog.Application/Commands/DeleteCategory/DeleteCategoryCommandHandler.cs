using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.DeleteCategory;

public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public DeleteCategoryCommandHandler(
        ICategoryRepository categoryRepository,
        IProductRepository productRepository,
        ICacheService cache)
    {
        _categoryRepository = categoryRepository;
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task Handle(DeleteCategoryCommand command, CancellationToken ct)
    {
        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, ct)
            ?? throw new KeyNotFoundException($"Category {command.CategoryId} not found.");

        // Check if any products are using this category
        var productsInCategory = await _productRepository.GetByCategoryAsync(command.CategoryId, ct);
        if (productsInCategory.Any())
        {
            throw new InvalidOperationException(
                $"Cannot delete category '{category.Name}' because it has {productsInCategory.Count} product(s) assigned to it. " +
                "Please reassign or delete the products first.");
        }

        // Detach any sub-categories that reference this category as their parent
        // This prevents the FK_Categories_Categories_ParentCategoryId constraint violation
        var subCategories = await _categoryRepository.GetSubCategoriesAsync(command.CategoryId, ct);
        foreach (var sub in subCategories)
        {
            sub.ClearParent();
        }

        if (subCategories.Any())
            await _categoryRepository.SaveChangesAsync(ct);

        // Soft delete: mark as deleted instead of physically removing the row.
        // The global EF query filter (!IsDeleted) will exclude it from all future queries.
        category.SoftDelete();
        await _categoryRepository.SaveChangesAsync(ct);

        await _cache.RemoveAsync("catalog:categories:v2:all", ct);
        await _cache.RemoveAsync("catalog:categories:all", ct);
    }
}
