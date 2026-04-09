using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Infrastructure.Services;

public class PasswordHasherService : IPasswordHasher
{
    // Using BCrypt-style hashing via ASP.NET Core's built-in hasher
    private readonly Microsoft.AspNetCore.Identity.PasswordHasher<object> _hasher = new();

    public string Hash(string password)
        => _hasher.HashPassword(new object(), password);

    public bool Verify(string password, string hash)
    {
        var result = _hasher.VerifyHashedPassword(new object(), hash, password);
        return result == Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success
            || result == Microsoft.AspNetCore.Identity.PasswordVerificationResult.SuccessRehashNeeded;
    }
}