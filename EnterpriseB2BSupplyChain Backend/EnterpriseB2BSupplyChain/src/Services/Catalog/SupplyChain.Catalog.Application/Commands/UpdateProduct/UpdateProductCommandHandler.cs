using MediatR;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Application.Commands.UpdateProduct;

public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand>
{
    private readonly IProductRepository _productRepository;
    private readonly ICacheService _cache;
    private readonly IImageDownloadService _imageService;

    public UpdateProductCommandHandler(
        IProductRepository productRepository,
        ICacheService cache,
        IImageDownloadService imageService)
    {
        _productRepository = productRepository;
        _cache = cache;
        _imageService = imageService;
    }

    public async Task Handle(UpdateProductCommand command, CancellationToken ct)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, ct)
            ?? throw new KeyNotFoundException($"Product {command.ProductId} not found.");

        // Download external image if provided
        var resolvedImageUrl = await _imageService.DownloadAndStoreAsync(
            command.ImageUrl, $"product_{command.ProductId:N}", ct);

        product.Update(
            command.Name,
            command.Description,
            command.Brand,
            command.UnitPrice,
            command.MinOrderQuantity,
            resolvedImageUrl
        );

        if (command.CategoryId.HasValue && command.CategoryId.Value != Guid.Empty
            && command.CategoryId.Value != product.CategoryId)
        {
            product.ChangeCategory(command.CategoryId.Value);
        }

        await _productRepository.SaveChangesAsync(ct);

        await _cache.RemoveAsync($"catalog:product:{command.ProductId}", ct);
        await _cache.RemoveByPatternAsync("catalog:products:*", ct);
    }
}
