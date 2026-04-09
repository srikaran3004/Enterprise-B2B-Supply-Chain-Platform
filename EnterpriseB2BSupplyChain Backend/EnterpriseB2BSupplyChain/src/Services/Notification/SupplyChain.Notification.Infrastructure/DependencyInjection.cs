using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Infrastructure.Persistence;
using SupplyChain.Notification.Infrastructure.Persistence.Repositories;
using SupplyChain.Notification.Infrastructure.Services;

namespace SupplyChain.Notification.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<NotificationDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection")!,
                sql => sql.EnableRetryOnFailure(3)));

        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<INotificationInboxRepository, NotificationInboxRepository>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddHostedService<RabbitMqNotificationConsumer>();

        return services;
    }
}
