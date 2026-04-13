using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Application.DTOs;

namespace SupplyChain.Catalog.Application.Queries.GetCategories;

public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, List<CategoryDto>>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICacheService _cache;

    public GetCategoriesQueryHandler(ICategoryRepository categoryRepository, ICacheService cache)
    {
        _categoryRepository = categoryRepository;
        _cache = cache;
    }

    public async Task<List<CategoryDto>> Handle(GetCategoriesQuery query, CancellationToken ct)
    {
        if (query.IncludeInactive)
        {
            var all = await _categoryRepository.GetAllAsync(ct);
            return all.Select(c => new CategoryDto(c.CategoryId, c.Name, c.Description, c.ParentCategoryId, c.IsActive)).ToList();
        }

        const string cacheKey = "catalog:categories:v2:all";
        var cached = await _cache.GetAsync<List<CategoryDto>>(cacheKey, ct);
        if (cached is not null)
            return cached;

        var categories = await _categoryRepository.GetAllActiveAsync(ct);
        var result = categories.Select(c => new CategoryDto(
            c.CategoryId, c.Name, c.Description, c.ParentCategoryId, c.IsActive
        )).ToList();

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10), ct);
        return result;
    }
}