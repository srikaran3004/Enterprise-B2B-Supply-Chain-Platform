using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Enums;
using SupplyChain.Order.Infrastructure.Persistence;

namespace SupplyChain.Order.Infrastructure.Services;

public class PaymentTimeoutBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PaymentTimeoutBackgroundService> _logger;

    public PaymentTimeoutBackgroundService(IServiceScopeFactory scopeFactory, ILogger<PaymentTimeoutBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAbandonedPaymentsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while executing PaymentTimeoutBackgroundService.");
            }

            // Run every 10 minutes
            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        }
    }

    private async Task CleanupAbandonedPaymentsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
        var inventoryClient = scope.ServiceProvider.GetRequiredService<IInventoryServiceClient>();

        var cutoffTime = DateTime.UtcNow.AddMinutes(-30);

        var abandonedOrders = await dbContext.Orders
            .Include(o => o.Lines)
            .Include(o => o.StatusHistory)
            .Where(o => o.Status == OrderStatus.PaymentPending && o.PlacedAt < cutoffTime)
            .ToListAsync(ct);

        if (!abandonedOrders.Any())
            return;

        foreach (var order in abandonedOrders)
        {
            try
            {
                // Restore inventory
                var inventoryLines = order.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList();
                await inventoryClient.RestoreOrderInventoryAsync(order.DealerId, inventoryLines, ct);

                // Cancel order
                order.Cancel(Guid.Empty, "Payment Timeout: Auto-cancelled after 30 mins");
                _logger.LogInformation("Cancelled abandoned order {OrderId} due to payment timeout.", order.OrderId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cleanup abandoned order {OrderId}", order.OrderId);
            }
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
