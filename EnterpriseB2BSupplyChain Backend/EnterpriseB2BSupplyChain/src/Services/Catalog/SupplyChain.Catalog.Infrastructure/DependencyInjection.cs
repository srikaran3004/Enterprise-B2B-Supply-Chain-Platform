using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RabbitMQ.Client;
using System.Net.Http.Headers;
using StackExchange.Redis;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Resilience;
using SupplyChain.SharedInfrastructure.Security;
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

        var rabbitHost = configuration["RabbitMQ:Host"] ?? "localhost";
        var rabbitUser = configuration["RabbitMQ:Username"] ?? "guest";
        var rabbitPass = configuration["RabbitMQ:Password"] ?? "guest";

        services.AddSingleton<IConnection>(_ =>
        {
            var factory = new ConnectionFactory
            {
                HostName = rabbitHost,
                UserName = rabbitUser,
                Password = rabbitPass
            };
            return factory.CreateConnectionAsync().GetAwaiter().GetResult();
        });

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IInventoryReservationService, InventoryReservationService>();
        services.AddScoped<IStockRestoredEventPublisher, StockRestoredEventPublisher>();

        var identityServiceUrl = configuration["ServiceUrls:IdentityService"] ?? "http://localhost:5002";
        services.AddHttpClient<IIdentityServiceClient, IdentityServiceClient>((sp, client) =>
        {
            client.BaseAddress = new Uri(identityServiceUrl);
            var tokenProvider = sp.GetRequiredService<IInternalServiceTokenProvider>();
            var token = tokenProvider.CreateToken("identity");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        })
            .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
            .AddStandardResiliencePolicies();

        // Image download service (uses HttpClient)
        services.AddHttpClient<IImageDownloadService, ImageDownloadService>();

        return services;
    }
}
