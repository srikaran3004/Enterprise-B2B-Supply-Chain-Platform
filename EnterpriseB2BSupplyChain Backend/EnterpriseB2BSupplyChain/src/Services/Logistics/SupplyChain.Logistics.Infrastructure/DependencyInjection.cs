using Hangfire;
using Hangfire.SqlServer;
using System.Net.Http.Headers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RabbitMQ.Client;
using StackExchange.Redis;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Resilience;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.Logistics.Infrastructure.Jobs;
using SupplyChain.Logistics.Infrastructure.Persistence;
using SupplyChain.Logistics.Infrastructure.Persistence.Repositories;
using SupplyChain.Logistics.Infrastructure.Services;

namespace SupplyChain.Logistics.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connString))
            throw new InvalidOperationException("Missing required configuration key: ConnectionStrings:DefaultConnection");

        services.AddDbContext<LogisticsDbContext>(options =>
            options.UseSqlServer(connString, sql => sql.EnableRetryOnFailure(3)));

        var redisConnection = configuration["Redis:ConnectionString"];
        if (string.IsNullOrWhiteSpace(redisConnection))
            throw new InvalidOperationException("Missing required configuration key: Redis:ConnectionString");

        var redisOptions = ConfigurationOptions.Parse(redisConnection);
        redisOptions.AbortOnConnectFail = false;
        redisOptions.ConnectTimeout   = 1000;   // 1s â€” fail fast if Redis is not running
        redisOptions.SyncTimeout      = 1000;
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

        services.AddScoped<IShipmentRepository,   ShipmentRepository>();
        services.AddScoped<IAgentRepository,      AgentRepository>();
        services.AddScoped<ITrackingCacheService,  TrackingCacheService>();
        services.AddScoped<IAgentAssignedEventPublisher, AgentAssignedEventPublisher>();
        services.AddScoped<IShipmentEventPublisher, ShipmentEventPublisher>();
        services.AddHostedService<OrderReadyForDispatchConsumer>();

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

        var orderServiceUrl = configuration["ServiceUrls:OrderService"] ?? "http://localhost:5006";
        services.AddHttpClient<IOrderServiceClient, OrderServiceClient>((sp, client) =>
        {
            client.BaseAddress = new Uri(orderServiceUrl);
            var tokenProvider = sp.GetRequiredService<IInternalServiceTokenProvider>();
            var token = tokenProvider.CreateToken("order");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        })
            .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
            .AddStandardResiliencePolicies();

        services.AddHangfire(cfg =>
            cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
               .UseSimpleAssemblyNameTypeSerializer()
               .UseRecommendedSerializerSettings()
               .UseSqlServerStorage(connString));

        services.AddHangfireServer();
        services.AddScoped<SlaMonitorJob>();

        return services;
    }
}

