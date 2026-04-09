using Microsoft.Extensions.DependencyInjection;
using SupplyChain.Notification.Application.Services;
using MediatR;
using System.Reflection; 

namespace SupplyChain.Notification.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<EmailDispatchService>();

        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));

        return services;
    }
}