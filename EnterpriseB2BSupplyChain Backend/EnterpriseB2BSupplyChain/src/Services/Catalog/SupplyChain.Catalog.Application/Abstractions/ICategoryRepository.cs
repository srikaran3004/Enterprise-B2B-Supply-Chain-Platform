using System;
using System.Collections.Generic;
using System.Text;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Abstractions
{
    public interface ICategoryRepository
    {
        Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken ct = default);
        Task<List<Category>> GetAllActiveAsync(CancellationToken ct = default);
        Task<List<Category>> GetAllAsync(CancellationToken ct = default);
        Task<List<Category>> GetSubCategoriesAsync(Guid parentCategoryId, CancellationToken ct = default);
        Task<bool> ExistsByNameAsync(string name, Guid? excludeCategoryId = null, CancellationToken ct = default);
        Task AddAsync(Category category, CancellationToken ct = default);
        void Delete(Category category);
        Task SaveChangesAsync(CancellationToken ct = default);
    }
}
