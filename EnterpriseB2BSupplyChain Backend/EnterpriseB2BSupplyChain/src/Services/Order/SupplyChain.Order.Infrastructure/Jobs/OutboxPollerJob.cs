using System.Text.Json;
using Hangfire;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Contracts;

namespace SupplyChain.Order.Infrastructure.Jobs;

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

    [AutomaticRetry(Attempts = 0)] // We handle retries ourselves
    public async Task ExecuteAsync()
    {
        var messages = await _outboxRepository.GetPendingAsync(batchSize: 50);

        if (!messages.Any()) return;

        using var channel = await _rabbitConnection.CreateChannelAsync();

        // Declare exchange if it doesn't exist
        await channel.ExchangeDeclareAsync(
            exchange: "supplychain.domain.events",
            type:     ExchangeType.Topic,
            durable:  true);

        foreach (var message in messages)
        {
            try
            {
                // Use an explicit mapping so every event type has a predictable,
                // well-formed routing key. The old string-replace approach broke
                // for events like "AdminApprovalRequired" (no "order" substring).
                var routingKey = message.EventType switch
                {
                    "OrderPlaced"           => "order.placed",
                    "AdminApprovalRequired" => "order.adminapprovalrequired",
                    "OrderDelivered"        => "order.delivered",
                    "OrderCancelled"        => "order.cancelled",
                    "ReturnRequested"       => "order.returnrequested",
                    _                       => message.EventType.ToLower().Replace(" ", "-")
                };

                var payloadElement = DeserializePayload(message.Payload);
                var correlationId = ResolveCorrelationId(payloadElement, message.MessageId);
                var envelope = new EventEnvelope<JsonElement>(
                    EventId: message.MessageId,
                    EventType: message.EventType,
                    OccurredAt: message.CreatedAt,
                    CorrelationId: correlationId,
                    Source: "order-service",
                    Payload: payloadElement);
                var body = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope));

                var props = new BasicProperties
                {
                    MessageId   = message.MessageId.ToString(),
                    ContentType = "application/json",
                    DeliveryMode = DeliveryModes.Persistent,
                    Headers = new Dictionary<string, object?>
                    {
                        ["EventType"]     = message.EventType,
                        ["ServiceSource"] = "OrderService",
                        ["CorrelationId"] = correlationId
                    }
                };

                await channel.BasicPublishAsync(
                    exchange:   "supplychain.domain.events",
                    routingKey: routingKey,
                    mandatory:  false,
                    basicProperties: props,
                    body:       body);

                message.MarkPublished();
                _logger.LogInformation("Published outbox message {MessageId} — {EventType} → {RoutingKey}",
                    message.MessageId, message.EventType, routingKey);
            }
            catch (Exception ex)
            {
                message.MarkFailed(ex.Message);
                _logger.LogWarning(ex, "Failed to publish outbox message {MessageId}", message.MessageId);
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

    private static string ResolveCorrelationId(JsonElement payload, Guid messageId)
    {
        if (payload.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in payload.EnumerateObject())
            {
                if ((property.NameEquals("correlationId") || property.NameEquals("CorrelationId"))
                    && property.Value.ValueKind == JsonValueKind.String)
                {
                    var value = property.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value!;
                    }
                }
            }
        }

        // Outbox rows created before correlation fields existed still get a stable ID.
        return messageId.ToString("N");
    }
}
