using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SupplyChain.Payment.Application.Abstractions;
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

        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<ICreditAccountRepository, CreditAccountRepository>();
        services.AddScoped<IInvoicePdfService, QuestPdfInvoiceService>();

        return services;
    }
}
