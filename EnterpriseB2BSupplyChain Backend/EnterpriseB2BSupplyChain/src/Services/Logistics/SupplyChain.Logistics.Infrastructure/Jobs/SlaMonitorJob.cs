using Hangfire;
using Microsoft.Extensions.Logging;
using SupplyChain.Logistics.Application.Abstractions;

namespace SupplyChain.Logistics.Infrastructure.Jobs;

public class SlaMonitorJob
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly ILogger<SlaMonitorJob> _logger;

    public SlaMonitorJob(
        IShipmentRepository shipmentRepository,
        ILogger<SlaMonitorJob> logger)
    {
        _shipmentRepository = shipmentRepository;
        _logger             = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    public async Task ExecuteAsync()
    {
        var shipments = await _shipmentRepository.GetActiveShipmentsForSlaCheckAsync();

        foreach (var shipment in shipments)
        {
            if (!shipment.IsSlaAtRisk()) continue;

            shipment.MarkSlaAtRisk();
            _logger.LogWarning(
                "SLA AT RISK — OrderId: {OrderId}, Deadline: {Deadline}",
                shipment.OrderId, shipment.SlaDeadlineUtc);

            // When RabbitMQ is wired up, publish SLAAtRisk event here
            // For now the log is the alert — Notification Service will hook in
        }

        await _shipmentRepository.SaveChangesAsync();
    }
}
