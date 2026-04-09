using System.Text.Json;
using Hangfire;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using SupplyChain.Order.Application.Abstractions;

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
                var routingKey = message.EventType.ToLower()
                    .Replace("order", "order.")
                    .TrimEnd('.');

                var body = System.Text.Encoding.UTF8.GetBytes(message.Payload);

                var props = new BasicProperties
                {
                    MessageId   = message.MessageId.ToString(),
                    ContentType = "application/json",
                    DeliveryMode = DeliveryModes.Persistent,
                    Headers = new Dictionary<string, object?>
                    {
                        ["EventType"]     = message.EventType,
                        ["ServiceSource"] = "OrderService"
                    }
                };

                await channel.BasicPublishAsync(
                    exchange:   "supplychain.domain.events",
                    routingKey: routingKey,
                    mandatory:  false,
                    basicProperties: props,
                    body:       body);

                message.MarkPublished();
                _logger.LogInformation("Published outbox message {MessageId} — {EventType}",
                    message.MessageId, message.EventType);
            }
            catch (Exception ex)
            {
                message.MarkFailed(ex.Message);
                _logger.LogWarning(ex, "Failed to publish outbox message {MessageId}", message.MessageId);
            }
        }

        await _outboxRepository.SaveChangesAsync();
    }
}
