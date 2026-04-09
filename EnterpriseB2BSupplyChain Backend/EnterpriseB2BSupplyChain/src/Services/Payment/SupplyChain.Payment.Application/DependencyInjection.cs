using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using SupplyChain.Payment.Application.Behaviors;

namespace SupplyChain.Payment.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);

            // Also scan Infrastructure assembly for query handlers (e.g. ExportSalesQueryHandler)
            var infraAssembly = AppDomain.CurrentDomain.GetAssemblies()
                .FirstOrDefault(a => a.GetName().Name == "SupplyChain.Payment.Infrastructure");
            if (infraAssembly is not null)
                cfg.RegisterServicesFromAssembly(infraAssembly);

            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
