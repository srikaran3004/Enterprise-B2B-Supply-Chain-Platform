using Microsoft.EntityFrameworkCore;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Infrastructure.Persistence.Repositories;

public class ShippingAddressRepository : IShippingAddressRepository
{
    private readonly IdentityDbContext _context;

    public ShippingAddressRepository(IdentityDbContext context)
        => _context = context;

    public async Task<List<ShippingAddress>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.ShippingAddresses
            .Where(s => s.DealerId == dealerId)
            .OrderByDescending(s => s.IsDefault)
            .ThenByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<ShippingAddress?> GetByIdAsync(Guid addressId, CancellationToken ct = default)
        => await _context.ShippingAddresses
            .FirstOrDefaultAsync(s => s.AddressId == addressId, ct);

    public async Task AddAsync(ShippingAddress address, CancellationToken ct = default)
        => await _context.ShippingAddresses.AddAsync(address, ct);

    public Task RemoveAsync(ShippingAddress address, CancellationToken ct = default)
    {
        _context.ShippingAddresses.Remove(address);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
