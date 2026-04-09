using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.UpdateCategory;

public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICacheService _cache;

    public UpdateCategoryCommandHandler(ICategoryRepository categoryRepository, ICacheService cache)
    {
        _categoryRepository = categoryRepository;
        _cache = cache;
    }

    public async Task Handle(UpdateCategoryCommand command, CancellationToken ct)
    {
        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, ct)
            ?? throw new KeyNotFoundException($"Category {command.CategoryId} not found.");

        if (await _categoryRepository.ExistsByNameAsync(command.Name, command.CategoryId, ct))
            throw new InvalidOperationException("Category already exists");

        category.Update(command.Name, command.Description);
        await _categoryRepository.SaveChangesAsync(ct);
        await _cache.RemoveAsync("catalog:categories:all", ct);
    }
}
