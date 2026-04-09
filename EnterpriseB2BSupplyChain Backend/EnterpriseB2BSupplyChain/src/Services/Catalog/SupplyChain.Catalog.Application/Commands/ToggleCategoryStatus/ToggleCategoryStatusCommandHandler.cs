using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.ToggleCategoryStatus;

public class ToggleCategoryStatusCommandHandler : IRequestHandler<ToggleCategoryStatusCommand>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;

    public ToggleCategoryStatusCommandHandler(
        ICategoryRepository categoryRepository,
        IProductRepository productRepository,
        ICacheService cache)
    {
        _categoryRepository = categoryRepository;
        _productRepository = productRepository;
        _cache = cache;
    }

    public async Task Handle(ToggleCategoryStatusCommand command, CancellationToken ct)
    {
        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, ct)
            ?? throw new KeyNotFoundException($"Category {command.CategoryId} not found.");

        if (command.Activate)
        {
            category.Activate();

            // Cascade: re-activate all products that belong to this category
            // Use GetAllByCategoryAsync so we include currently-inactive products
            var products = await _productRepository.GetAllByCategoryAsync(command.CategoryId, ct);
            foreach (var product in products)
                product.Activate();

            await _productRepository.SaveChangesAsync(ct);
            await _cache.RemoveByPatternAsync("catalog:products:*", ct);
        }
        else
        {
            category.Deactivate();

            // Cascade: deactivate all products belonging to this category
            var products = await _productRepository.GetByCategoryAsync(command.CategoryId, ct);
            foreach (var product in products)
                product.Deactivate();

            await _productRepository.SaveChangesAsync(ct);
            await _cache.RemoveByPatternAsync("catalog:products:*", ct);
        }

        await _categoryRepository.SaveChangesAsync(ct);
        await _cache.RemoveAsync("catalog:categories:all", ct);
    }
}
