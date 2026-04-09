using MediatR;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Application.Commands.CreateProduct;

public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Guid>
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ICacheService _cache;
    private readonly IImageDownloadService _imageService;

    public CreateProductCommandHandler(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        ICacheService cache,
        IImageDownloadService imageService)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _cache = cache;
        _imageService = imageService;
    }

    public async Task<Guid> Handle(CreateProductCommand command, CancellationToken ct)
    {
        if (await _productRepository.SkuExistsAsync(command.SKU, ct))
            throw new InvalidOperationException($"SKU '{command.SKU}' is already in use.");

        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, ct)
            ?? throw new KeyNotFoundException($"Category {command.CategoryId} not found.");

        // Download external image if provided
        var resolvedImageUrl = await _imageService.DownloadAndStoreAsync(
            command.ImageUrl, $"product_{command.SKU}", ct);

        var product = Product.Create(
            sku: command.SKU,
            name: command.Name,
            description: command.Description,
            brand: command.Brand,
            categoryId: command.CategoryId,
            unitPrice: command.UnitPrice,
            minOrderQuantity: command.MinOrderQuantity,
            initialStock: command.InitialStock,
            imageUrl: resolvedImageUrl
        );

        await _productRepository.AddAsync(product, ct);
        await _productRepository.SaveChangesAsync(ct);

        await _cache.RemoveByPatternAsync("catalog:products:*", ct);

        return product.ProductId;
    }
}
