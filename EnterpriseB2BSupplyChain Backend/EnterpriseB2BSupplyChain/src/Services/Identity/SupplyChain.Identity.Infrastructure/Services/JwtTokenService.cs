using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Domain.Entities;

namespace SupplyChain.Identity.Infrastructure.Services;

public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
        => _config = config;

    public string GenerateAccessToken(User user)
    {
        var secret = _config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "15");

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier,     user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               user.Role.ToString()),
            new Claim("fullName",                    user.FullName),
            new Claim("dealerId",                    user.DealerProfile?.DealerProfileId.ToString() ?? user.UserId.ToString()),
        };

        // SuperAdmin inherits Admin role — add a second role claim so that
        // endpoints decorated with [Authorize(Roles = "Admin")] also accept SuperAdmin tokens.
        if (user.Role == Domain.Enums.UserRole.SuperAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
        }

        // Add dealer profile information to JWT claims
        if (user.DealerProfile != null)
        {
            if (!string.IsNullOrEmpty(user.DealerProfile.BusinessName))
                claims.Add(new Claim("businessName", user.DealerProfile.BusinessName));
            if (!string.IsNullOrEmpty(user.DealerProfile.GstNumber))
                claims.Add(new Claim("gstNumber", user.DealerProfile.GstNumber));
            if (!string.IsNullOrEmpty(user.PhoneNumber))
                claims.Add(new Claim("phoneNumber", user.PhoneNumber));
            if (!string.IsNullOrEmpty(user.DealerProfile.AddressLine1))
                claims.Add(new Claim("addressLine1", user.DealerProfile.AddressLine1));
            if (!string.IsNullOrEmpty(user.DealerProfile.City))
                claims.Add(new Claim("city", user.DealerProfile.City));
            if (!string.IsNullOrEmpty(user.DealerProfile.State))
                claims.Add(new Claim("state", user.DealerProfile.State));
            if (!string.IsNullOrEmpty(user.DealerProfile.PinCode))
                claims.Add(new Claim("pinCode", user.DealerProfile.PinCode));
        }

        if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
        {
            claims.Add(new Claim("profilePictureUrl", user.ProfilePictureUrl));
        }

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    public Guid? GetUserIdFromToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            var sub = jwt.Subject;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
        catch { return null; }
    }

    public string? GetJtiFromToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            return jwt.Id;
        }
        catch { return null; }
    }

    public DateTime GetTokenExpiry(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        return jwt.ValidTo;
    }

    public int GetTokenExpirySeconds()
    {
        var expiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"], out var mins) ? mins : 60;
        return expiryMinutes * 60;
    }
}