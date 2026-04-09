using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using SupplyChain.Catalog.Application.Abstractions;
using SupplyChain.Catalog.Infrastructure.Persistence;
using SupplyChain.Catalog.Infrastructure.Persistence.Repositories;
using SupplyChain.Catalog.Infrastructure.Services;

namespace SupplyChain.Catalog.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<CatalogDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                sql => sql.EnableRetryOnFailure(3)
            )
        );

        var redisConnection = configuration["Redis:ConnectionString"]!;
        var redisOptions = ConfigurationOptions.Parse(redisConnection);
        redisOptions.AbortOnConnectFail = false;
        redisOptions.ConnectTimeout   = 1000;   // 1s — fail fast if Redis is not running
        redisOptions.SyncTimeout      = 1000;   // 1s per operation
        redisOptions.AsyncTimeout     = 1000;
        redisOptions.ConnectRetry     = 0;

        services.AddSingleton<IConnectionMultiplexer>(
            ConnectionMultiplexer.Connect(redisOptions));

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IInventoryReservationService, InventoryReservationService>();

        // Image download service (uses HttpClient)
        services.AddHttpClient<IImageDownloadService, ImageDownloadService>();

        return services;
    }
}
