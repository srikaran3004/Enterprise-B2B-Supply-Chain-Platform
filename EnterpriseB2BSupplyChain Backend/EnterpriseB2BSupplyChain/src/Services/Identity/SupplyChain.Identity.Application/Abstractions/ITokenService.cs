using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Application.Abstractions;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    string HashToken(string token);
    Guid? GetUserIdFromToken(string token);
    string? GetJtiFromToken(string token);
    DateTime GetTokenExpiry(string token);

    /// <summary>Returns the configured JWT lifetime in seconds (Jwt:ExpiryMinutes × 60).</summary>
    int GetTokenExpirySeconds();
}