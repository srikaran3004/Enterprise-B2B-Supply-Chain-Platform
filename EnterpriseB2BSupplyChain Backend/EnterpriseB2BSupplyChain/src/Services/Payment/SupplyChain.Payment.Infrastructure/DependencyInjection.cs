using Hangfire;
using Hangfire.SqlServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;
using RabbitMQ.Client;
using SupplyChain.SharedInfrastructure.Correlation;
using SupplyChain.SharedInfrastructure.Resilience;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Infrastructure.Jobs;
using SupplyChain.Payment.Infrastructure.Persistence;
using SupplyChain.Payment.Infrastructure.Persistence.Repositories;
using SupplyChain.Payment.Infrastructure.Services;

namespace SupplyChain.Payment.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<PaymentDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection")!,
                sql => sql.EnableRetryOnFailure(3)));

        // RabbitMQ connection (singleton — one connection, many channels)
        var rabbitHost = configuration["RabbitMQ:Host"] ?? "localhost";
        var rabbitUser = configuration["RabbitMQ:Username"] ?? "guest";
        var rabbitPass = configuration["RabbitMQ:Password"] ?? "guest";

        services.AddSingleton<RabbitMQ.Client.IConnection>(_ =>
        {
            var factory = new RabbitMQ.Client.ConnectionFactory
            {
                HostName = rabbitHost,
                UserName = rabbitUser,
                Password = rabbitPass
            };
            return factory.CreateConnectionAsync().GetAwaiter().GetResult();
        });

        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<ICreditAccountRepository, CreditAccountRepository>();
        services.AddScoped<IPurchaseLimitHistoryRepository, PurchaseLimitHistoryRepository>();
        services.AddScoped<IPaymentRecordRepository, PaymentRecordRepository>();
        services.AddScoped<IInvoicePdfService, QuestPdfInvoiceService>();
        services.AddScoped<IOutboxRepository, OutboxRepository>();

        var orderServiceUrl = configuration["ServiceUrls:OrderService"] ?? "http://localhost:5006";
        services.AddHttpClient<IOrderInternalClient, OrderInternalClient>((sp, client) =>
        {
            client.BaseAddress = new Uri(orderServiceUrl);
            var tokenProvider = sp.GetRequiredService<IInternalServiceTokenProvider>();
            var token = tokenProvider.CreateToken("order");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        })
            .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
            .AddStandardResiliencePolicies();

        services.AddHttpClient<IOrderPaymentConfirmationClient, OrderPaymentConfirmationClient>((sp, client) =>
        {
            client.BaseAddress = new Uri(orderServiceUrl);
            var tokenProvider = sp.GetRequiredService<IInternalServiceTokenProvider>();
            var token = tokenProvider.CreateToken("order");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        })
            .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
            .AddStandardResiliencePolicies();

        services.AddHostedService<OrderDeliveredConsumer>();

        var connString = configuration.GetConnectionString("DefaultConnection")!;
        services.AddHangfire(cfg =>
            cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
               .UseSimpleAssemblyNameTypeSerializer()
               .UseRecommendedSerializerSettings()
               .UseSqlServerStorage(connString));

        services.AddHangfireServer();
        services.AddScoped<OutboxPollerJob>();
        services.AddScoped<OutboxCleanupJob>();

        return services;
    }
}
