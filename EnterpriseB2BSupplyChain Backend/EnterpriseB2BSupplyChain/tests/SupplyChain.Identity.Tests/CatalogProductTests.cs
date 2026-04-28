using SupplyChain.Catalog.Domain.Entities;
using SupplyChain.Catalog.Domain.Enums;
using CatalogDomainException = SupplyChain.Catalog.Domain.Exceptions.DomainException;

namespace SupplyChain.Identity.Tests;

public class CatalogProductTests
{
    [Test]
    public void Create_WithValidInput_NormalizesSkuAndStartsActive()
    {
        var categoryId = Guid.NewGuid();

        var product = Product.Create(
            sku: "  abc-123 ",
            name: "Sample Product",
            description: "Desc",
            brand: "Brand",
            categoryId: categoryId,
            unitPrice: 100,
            minOrderQuantity: 5,
            initialStock: 50);

        Assert.Multiple(() =>
        {
            Assert.That(product.SKU, Is.EqualTo("ABC-123"));
            Assert.That(product.Status, Is.EqualTo(ProductStatus.Active));
            Assert.That(product.AvailableStock, Is.EqualTo(50));
        });
    }

    [Test]
    public void HardDeductStock_WhenQuantityExceedsAvailable_ThrowsDomainException()
    {
        var product = Product.Create(
            sku: "SKU-1",
            name: "Milk",
            description: null,
            brand: null,
            categoryId: Guid.NewGuid(),
            unitPrice: 25,
            minOrderQuantity: 1,
            initialStock: 5);

        var ex = Assert.Throws<CatalogDomainException>(() => product.HardDeductStock(10));

        Assert.That(ex!.Code, Is.EqualTo("INSUFFICIENT_STOCK"));
    }

    [Test]
    public void Deactivate_ThenActivate_ChangesStatus()
    {
        var product = Product.Create(
            sku: "SKU-2",
            name: "Soap",
            description: null,
            brand: null,
            categoryId: Guid.NewGuid(),
            unitPrice: 35,
            minOrderQuantity: 1,
            initialStock: 10);

        product.Deactivate();
        Assert.That(product.Status, Is.EqualTo(ProductStatus.Inactive));

        product.Activate();
        Assert.That(product.Status, Is.EqualTo(ProductStatus.Active));
    }
}
