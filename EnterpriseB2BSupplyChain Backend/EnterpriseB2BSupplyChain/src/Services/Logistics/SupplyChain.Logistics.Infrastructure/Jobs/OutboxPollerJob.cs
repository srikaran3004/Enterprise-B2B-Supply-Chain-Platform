using System.Text.Json;
using Hangfire;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Contracts;

namespace SupplyChain.Logistics.Infrastructure.Jobs;

public class OutboxPollerJob
{
    private readonly IOutboxRepository _outboxRepository;
    private readonly IConnection       _rabbitConnection;
    private readonly ILogger<OutboxPollerJob> _logger;

    public OutboxPollerJob(
        IOutboxRepository outboxRepository,
        IConnection       rabbitConnection,
        ILogger<OutboxPollerJob> logger)
    {
        _outboxRepository = outboxRepository;
        _rabbitConnection = rabbitConnection;
        _logger           = logger;
    }

    [AutomaticRetry(Attempts = 0)] // Retries are handled by the MarkFailed / re-poll cycle
    public async Task ExecuteAsync()
    {
        var messages = await _outboxRepository.GetPendingAsync(batchSize: 50);

        if (!messages.Any()) return;

        await using var channel = await _rabbitConnection.CreateChannelAsync();

        await channel.ExchangeDeclareAsync(
            exchange: "supplychain.domain.events",
            type:     ExchangeType.Topic,
            durable:  true);

        foreach (var message in messages)
        {
            try
            {
                var routingKey = message.EventType switch
                {
                    "AgentAssigned"        => "agent.assigned",
                    "VehicleBreakdown"     => "shipment.breakdown",
                    "OrderDelivered"       => "shipment.delivered",
                    "ShipmentStatusUpdated"=> "shipment.status",
                    _                      => $"logistics.{message.EventType.ToLowerInvariant()}"
                };

                var payloadElement = DeserializePayload(message.Payload);
                var envelope = new EventEnvelope<JsonElement>(
                    EventId:       message.MessageId,
                    EventType:     message.EventType,
                    OccurredAt:    message.CreatedAt,
                    CorrelationId: message.MessageId.ToString("N"),
                    Source:        "logistics-service",
                    Payload:       payloadElement);

                var body = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope));

                var props = new BasicProperties
                {
                    MessageId    = message.MessageId.ToString(),
                    ContentType  = "application/json",
                    DeliveryMode = DeliveryModes.Persistent,
                    Headers = new Dictionary<string, object?>
                    {
                        ["EventType"]     = message.EventType,
                        ["ServiceSource"] = "LogisticsService"
                    }
                };

                await channel.BasicPublishAsync(
                    exchange:        "supplychain.domain.events",
                    routingKey:      routingKey,
                    mandatory:       false,
                    basicProperties: props,
                    body:            body);

                message.MarkPublished();
                _logger.LogInformation(
                    "Published logistics outbox message {MessageId} — {EventType} → {RoutingKey}",
                    message.MessageId, message.EventType, routingKey);
            }
            catch (Exception ex)
            {
                message.MarkFailed(ex.Message);
                _logger.LogWarning(ex,
                    "Failed to publish logistics outbox message {MessageId}", message.MessageId);
            }
        }

        await _outboxRepository.SaveChangesAsync();
    }

    private static JsonElement DeserializePayload(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<JsonElement>(payload);
        }
        catch
        {
            return JsonSerializer.SerializeToElement(new { rawPayload = payload });
        }
    }
}
