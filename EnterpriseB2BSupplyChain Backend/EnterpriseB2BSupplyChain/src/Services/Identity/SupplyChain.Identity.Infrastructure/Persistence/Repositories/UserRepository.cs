using Microsoft.EntityFrameworkCore;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IdentityDbContext _context;

    public UserRepository(IdentityDbContext context)
        => _context = context;

    public async Task<User?> GetByIdAsync(Guid userId, CancellationToken ct = default)
        => await _context.Users
            .Include(u => u.DealerProfile)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

    public async Task<User?> GetDealerByProfileIdAsync(Guid dealerProfileId, CancellationToken ct = default)
        => await _context.Users
            .Include(u => u.DealerProfile)
            .FirstOrDefaultAsync(
                u => u.Role == UserRole.Dealer
                    && u.DealerProfile != null
                    && u.DealerProfile.DealerProfileId == dealerProfileId,
                ct);

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await _context.Users
            .Include(u => u.DealerProfile)
            .FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public async Task<User?> GetByEmailForAuthAsync(string email, CancellationToken ct = default)
        => await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await _context.Users
            .AnyAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public async Task<bool> GstNumberExistsAsync(string gstNumber, CancellationToken ct = default)
        => await _context.DealerProfiles
            .AnyAsync(d => d.GstNumber == gstNumber.ToUpperInvariant(), ct);

    public async Task AddAsync(User user, CancellationToken ct = default)
        => await _context.Users.AddAsync(user, ct);

    public async Task AddDealerProfileAsync(DealerProfile profile, CancellationToken ct = default)
        => await _context.DealerProfiles.AddAsync(profile, ct);

    public async Task<List<User>> GetDealersByStatusAsync(UserStatus? status, CancellationToken ct = default)
    {
        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.DealerProfile)
            .Where(u => u.Role == UserRole.Dealer);

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        return await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<User>> GetUsersByRoleAsync(UserRole role, CancellationToken ct = default)
        => await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == role)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<User>> GetUsersByRolesAsync(UserRole[] roles, CancellationToken ct = default)
    {
        if (roles is null || roles.Length == 0)
            return [];

        return await _context.Users
            .AsNoTracking()
            .Where(u => roles.Contains(u.Role))
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddOtpRecordAsync(OtpRecord otpRecord, CancellationToken ct = default)
        => await _context.OtpRecords.AddAsync(otpRecord, ct);

    public async Task<OtpRecord?> GetLatestActiveOtpAsync(string email, OtpPurpose purpose, CancellationToken ct = default)
        => await _context.OtpRecords
            .Where(o => o.Email == email.ToLowerInvariant() && o.Purpose == purpose && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken ct = default)
        => await _context.RefreshTokens.AddAsync(refreshToken, ct);

    public async Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default)
        => await _context.RefreshTokens
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task<int> RevokeAllActiveRefreshTokensAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await _context.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ExecuteUpdateAsync(setters => setters
                    .SetProperty(t => t.IsRevoked, true)
                    .SetProperty(t => t.RevokedAt, now),
                ct);
    }

    public async Task<int> CleanupStaleRefreshTokensAsync(DateTime utcNow, DateTime revokedBeforeUtc, CancellationToken ct = default)
        => await _context.RefreshTokens
            .Where(t => t.ExpiresAt <= utcNow || (t.IsRevoked && t.RevokedAt != null && t.RevokedAt <= revokedBeforeUtc))
            .ExecuteDeleteAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public void Delete(User user)
        => _context.Users.Remove(user);
}
