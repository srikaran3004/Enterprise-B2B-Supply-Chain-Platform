using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Application.Abstractions;

public interface IShippingAddressRepository
{
    Task<List<ShippingAddress>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default);
    Task<ShippingAddress?> GetByIdAsync(Guid addressId, CancellationToken ct = default);
    Task AddAsync(ShippingAddress address, CancellationToken ct = default);
    Task RemoveAsync(ShippingAddress address, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
