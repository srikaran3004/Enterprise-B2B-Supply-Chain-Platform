using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace SupplyChain.SharedInfrastructure.Security;

public interface IInternalServiceTokenProvider
{
    string CreateToken(string audience);
}

internal sealed class InternalServiceTokenProvider : IInternalServiceTokenProvider
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null
    };

    private readonly IConfiguration _configuration;

    public InternalServiceTokenProvider(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string CreateToken(string audience)
    {
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Missing required Jwt:Secret configuration.");

        var issuer = _configuration["Jwt:Issuer"] ?? "UniSupplyPlatform";
        var serviceName = _configuration["Service:Name"]
            ?? AppDomain.CurrentDomain.FriendlyName
            ?? "unknown-service";

        var expiryMinutes = int.TryParse(_configuration["Jwt:InternalExpiryMinutes"], out var parsed)
            ? Math.Clamp(parsed, 1, 120)
            : 10;

        var now = DateTimeOffset.UtcNow;
        var payload = new Dictionary<string, object?>
        {
            ["iss"] = issuer,
            ["aud"] = audience,
            ["sub"] = serviceName,
            ["jti"] = Guid.NewGuid().ToString("N"),
            ["iat"] = now.ToUnixTimeSeconds(),
            ["nbf"] = now.AddSeconds(-5).ToUnixTimeSeconds(),
            ["exp"] = now.AddMinutes(expiryMinutes).ToUnixTimeSeconds(),
            [InternalAuthDefaults.ClientTypeClaim] = InternalAuthDefaults.InternalClientType,
            ["service_name"] = serviceName,
            ["role"] = InternalAuthDefaults.InternalRole,
            ["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] = InternalAuthDefaults.InternalRole,
        };

        var headerJson = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["alg"] = "HS256",
            ["typ"] = "JWT"
        }, JsonOptions);

        var payloadJson = JsonSerializer.Serialize(payload, JsonOptions);

        var encodedHeader = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        var encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
        var unsignedToken = $"{encodedHeader}.{encodedPayload}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var signature = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken));
        return $"{unsignedToken}.{Base64UrlEncode(signature)}";
    }

    private static string Base64UrlEncode(byte[] value)
    {
        return Convert.ToBase64String(value)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}

