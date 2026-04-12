using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Infrastructure.Jobs;
using SupplyChain.Identity.Infrastructure.Persistence;
using SupplyChain.Identity.Infrastructure.Persistence.Repositories;
using SupplyChain.Identity.Infrastructure.Services;

namespace SupplyChain.Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<IdentityDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                sql => sql.EnableRetryOnFailure(3)
            )
        );

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IShippingAddressRepository, ShippingAddressRepository>();
        services.AddScoped<IPasswordHasher, PasswordHasherService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IEmailService, SmtpEmailService>();

        // Redis cache (fail-fast so user-facing requests do not stall when Redis is unavailable)
        var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6379,abortConnect=false";
        var redisOptions = ConfigurationOptions.Parse(redisConn);
        redisOptions.AbortOnConnectFail = false;
        redisOptions.ConnectTimeout = 1000;
        redisOptions.SyncTimeout = 1000;
        redisOptions.AsyncTimeout = 1000;
        redisOptions.ConnectRetry = 0;

        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(redisOptions));
        services.AddSingleton<ICacheService, RedisCacheService>();
        services.AddHostedService<OtpCleanupBackgroundService>();
        services.AddHostedService<RefreshTokenCleanupBackgroundService>();

        return services;
    }
}
