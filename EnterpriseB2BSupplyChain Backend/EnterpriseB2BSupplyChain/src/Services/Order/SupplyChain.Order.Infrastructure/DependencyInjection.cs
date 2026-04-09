using Hangfire;
using Hangfire.SqlServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RabbitMQ.Client;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Infrastructure.Jobs;
using SupplyChain.Order.Infrastructure.Persistence;
using SupplyChain.Order.Infrastructure.Persistence.Repositories;
using SupplyChain.Order.Infrastructure.Services;

namespace SupplyChain.Order.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // SQL Server
        var connString = configuration.GetConnectionString("DefaultConnection")!;
        services.AddDbContext<OrderDbContext>(options =>
            options.UseSqlServer(connString, sql => sql.EnableRetryOnFailure(3)));

        // RabbitMQ connection (singleton — one connection, many channels)
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

        // Repositories
        services.AddScoped<IOrderRepository,  OrderRepository>();
        services.AddScoped<IOutboxRepository, OutboxRepository>();

        // Payment Service HTTP Client
        var paymentServiceUrl = configuration["ServiceUrls:PaymentService"] ?? "http://localhost:5010";
        services.AddHttpClient<IPaymentServiceClient, PaymentServiceClient>(client =>
            client.BaseAddress = new Uri(paymentServiceUrl));

        // Identity Service HTTP Client
        var identityServiceUrl = configuration["ServiceUrls:IdentityService"] ?? "http://localhost:5002";
        services.AddHttpClient<IIdentityServiceClient, IdentityServiceClient>(client =>
            client.BaseAddress = new Uri(identityServiceUrl));

        // Hangfire
        services.AddHangfire(cfg =>
            cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
               .UseSimpleAssemblyNameTypeSerializer()
               .UseRecommendedSerializerSettings()
               .UseSqlServerStorage(connString));

        services.AddHangfireServer();
        services.AddScoped<OutboxPollerJob>();

        return services;
    }
}
