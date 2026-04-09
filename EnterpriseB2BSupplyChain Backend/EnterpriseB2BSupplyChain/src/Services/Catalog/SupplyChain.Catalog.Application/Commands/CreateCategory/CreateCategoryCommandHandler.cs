using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Commands.CreateCategory;

public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, Guid>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICacheService _cache;

    public CreateCategoryCommandHandler(ICategoryRepository categoryRepository, ICacheService cache)
    {
        _categoryRepository = categoryRepository;
        _cache = cache;
    }

    public async Task<Guid> Handle(CreateCategoryCommand command, CancellationToken ct)
    {
        if (await _categoryRepository.ExistsByNameAsync(command.Name, null, ct))
            throw new InvalidOperationException("Category already exists");

        var category = Category.Create(command.Name, command.Description, command.ParentCategoryId);
        await _categoryRepository.AddAsync(category, ct);
        await _categoryRepository.SaveChangesAsync(ct);
        await _cache.RemoveAsync("catalog:categories:all", ct);
        return category.CategoryId;
    }
}
