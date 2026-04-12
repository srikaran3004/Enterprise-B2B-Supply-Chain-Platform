using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid userId, CancellationToken ct = default);
    Task<User?> GetDealerByProfileIdAsync(Guid dealerProfileId, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByEmailForAuthAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<bool> GstNumberExistsAsync(string gstNumber, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    Task AddDealerProfileAsync(DealerProfile profile, CancellationToken ct = default);
    Task<List<User>> GetDealersByStatusAsync(UserStatus? status, CancellationToken ct = default);
    Task<List<User>> GetUsersByRoleAsync(UserRole role, CancellationToken ct = default);
    Task<List<User>> GetUsersByRolesAsync(UserRole[] roles, CancellationToken ct = default);
    Task AddOtpRecordAsync(OtpRecord otpRecord, CancellationToken ct = default);
    Task<OtpRecord?> GetLatestActiveOtpAsync(string email, OtpPurpose purpose, CancellationToken ct = default);
    Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken ct = default);
    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default);
    Task<int> RevokeAllActiveRefreshTokensAsync(Guid userId, CancellationToken ct = default);
    Task<int> CleanupStaleRefreshTokensAsync(DateTime utcNow, DateTime revokedBeforeUtc, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    void Delete(User user);
}
