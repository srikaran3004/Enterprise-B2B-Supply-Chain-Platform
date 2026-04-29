using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SupplyChain.Logistics.Application.Commands.CreateShipment;
using SupplyChain.Logistics.Domain.Entities;
using SupplyChain.Logistics.Infrastructure.Persistence;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class OrderReadyForDispatchConsumer : BackgroundService
{
    private const string ConsumerName = "logistics-order-ready-consumer";

    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OrderReadyForDispatchConsumer> _logger;
    private readonly int _maxRetries;

    private IConnection? _connection;
    private IChannel? _channel;
    private string _exchange = "supplychain.domain.events";
    private string _queue = "logistics.order-ready.queue";
    private string _routingKey = "order.readyfordispatch";
    private string _deadLetterExchange = "supplychain.domain.events.dead";
    private string _deadLetterQueue = "logistics.order-ready.queue.dead";
    private string _deadLetterRoutingKey = "logistics.order-ready.queue.dead";

    public OrderReadyForDispatchConsumer(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<OrderReadyForDispatchConsumer> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _maxRetries = _configuration.GetValue<int?>("RabbitMQ:MaxRetries") ?? 5;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var host = _configuration["RabbitMQ:Host"] ?? "localhost";
        var username = _configuration["RabbitMQ:Username"] ?? "guest";
        var password = _configuration["RabbitMQ:Password"] ?? "guest";
        _exchange = _configuration["RabbitMQ:Exchange"] ?? "supplychain.domain.events";
        _queue = _configuration["RabbitMQ:OrderReadyQueue"] ?? "logistics.order-ready.queue";
        _routingKey = _configuration["RabbitMQ:OrderReadyRoutingKey"] ?? "order.readyfordispatch";
        _deadLetterExchange = _configuration["RabbitMQ:DeadLetterExchange"] ?? $"{_exchange}.dead";
        _deadLetterQueue = _configuration["RabbitMQ:DeadLetterQueue"] ?? $"{_queue}.dead";
        _deadLetterRoutingKey = _configuration["RabbitMQ:DeadLetterRoutingKey"] ?? $"{_queue}.dead";

        var factory = new ConnectionFactory
        {
            HostName = host,
            UserName = username,
            Password = password
        };

        _connection = await factory.CreateConnectionAsync(cancellationToken: stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await _channel.ExchangeDeclareAsync(
            exchange: _exchange,
            type: ExchangeType.Topic,
            durable: true,
            cancellationToken: stoppingToken);

        await _channel.ExchangeDeclareAsync(
            exchange: _deadLetterExchange,
            type: ExchangeType.Topic,
            durable: true,
            cancellationToken: stoppingToken);

        await _channel.QueueDeclareAsync(
            queue: _queue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: stoppingToken);

        await _channel.QueueDeclareAsync(
            queue: _deadLetterQueue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: stoppingToken);

        await _channel.QueueBindAsync(
            queue: _queue,
            exchange: _exchange,
            routingKey: _routingKey,
            cancellationToken: stoppingToken);

        await _channel.QueueBindAsync(
            queue: _deadLetterQueue,
            exchange: _deadLetterExchange,
            routingKey: _deadLetterRoutingKey,
            cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, args) => await HandleMessageAsync(args, stoppingToken);

        await _channel.BasicConsumeAsync(
            queue: _queue,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        _logger.LogInformation(
            "OrderReadyForDispatch consumer started. Queue: {Queue}, RoutingKey: {RoutingKey}, DLQ: {DeadLetterQueue}, MaxRetries: {MaxRetries}",
            _queue, _routingKey, _deadLetterQueue, _maxRetries);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleMessageAsync(BasicDeliverEventArgs args, CancellationToken ct)
    {
        if (_channel is null)
            return;

        var rawBody = Encoding.UTF8.GetString(args.Body.ToArray());
        var headerEventType = GetEventTypeFromHeaders(args);
        var (eventType, correlationId, envelopeEventId, payload) = ParseEnvelope(rawBody, headerEventType);
        var messageId = ResolveMessageId(args, envelopeEventId, rawBody, eventType);

        try
        {
            if (!eventType.Equals("OrderReadyForDispatch", StringComparison.OrdinalIgnoreCase))
            {
                await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                return;
            }

            var orderId = TryReadGuid(payload, "OrderId", "orderId");
            if (!orderId.HasValue)
            {
                _logger.LogWarning(
                    "Skipping OrderReadyForDispatch due to missing OrderId. MessageId={MessageId}",
                    messageId);
                await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<LogisticsDbContext>();

            var alreadyProcessed = await db.ConsumedMessages
                .AnyAsync(x => x.MessageId == messageId && x.Consumer == ConsumerName, ct);
            if (alreadyProcessed)
            {
                await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                return;
            }

            var defaultSlaHours = _configuration.GetValue<int?>("Logistics:DefaultSlaHours") ?? 72;
            var dealerId = TryReadGuid(payload, "DealerId", "dealerId") ?? Guid.Empty;
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
            await mediator.Send(
                new CreateShipmentCommand(orderId.Value, dealerId, DateTime.UtcNow.AddHours(defaultSlaHours)),
                ct);

            db.ConsumedMessages.Add(ConsumedMessage.Create(messageId, ConsumerName, eventType, correlationId));
            await db.SaveChangesAsync(ct);

            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
        catch (Exception ex)
        {
            var nextRetry = GetRetryCount(args.BasicProperties?.Headers) + 1;
            if (nextRetry > _maxRetries)
            {
                await PublishDeadLetterAsync(args, eventType, messageId, nextRetry, ex.Message, ct);
                _logger.LogError(ex,
                    "Logistics event moved to DLQ. EventType={EventType}, MessageId={MessageId}, Retries={Retries}",
                    eventType, messageId, nextRetry - 1);
            }
            else
            {
                await PublishRetryAsync(args, eventType, messageId, nextRetry, ex.Message, ct);
                _logger.LogWarning(ex,
                    "Logistics event retry queued. EventType={EventType}, MessageId={MessageId}, Retry={Retry}/{MaxRetries}",
                    eventType, messageId, nextRetry, _maxRetries);
            }

            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
    }

    private static string GetEventTypeFromHeaders(BasicDeliverEventArgs args)
    {
        if (args.BasicProperties?.Headers is not null &&
            args.BasicProperties.Headers.TryGetValue("EventType", out var value))
        {
            if (value is byte[] bytes)
                return Encoding.UTF8.GetString(bytes);
            if (value is ReadOnlyMemory<byte> memory)
                return Encoding.UTF8.GetString(memory.Span);
            if (value is string text)
                return text;
        }

        return args.RoutingKey;
    }

    private static (string EventType, string? CorrelationId, Guid? EventId, JsonElement Payload) ParseEnvelope(
        string rawBody,
        string fallbackEventType)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Object &&
                TryGetProperty(root, "payload", out var payloadElement) &&
                payloadElement.ValueKind == JsonValueKind.Object)
            {
                var eventType = TryGetProperty(root, "eventType", out var evt)
                    ? evt.GetString() ?? fallbackEventType
                    : fallbackEventType;

                string? correlationId = null;
                if (TryGetProperty(root, "correlationId", out var cid) && cid.ValueKind == JsonValueKind.String)
                    correlationId = cid.GetString();

                Guid? eventId = null;
                if (TryGetProperty(root, "eventId", out var idElement) &&
                    idElement.ValueKind == JsonValueKind.String &&
                    Guid.TryParse(idElement.GetString(), out var parsedId))
                {
                    eventId = parsedId;
                }

                return (eventType, correlationId, eventId, payloadElement.Clone());
            }

            return (fallbackEventType, null, null, root.Clone());
        }
        catch
        {
            return (fallbackEventType, null, null, JsonSerializer.SerializeToElement(new { rawPayload = rawBody }));
        }
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private static Guid? TryReadGuid(JsonElement payload, params string[] names)
    {
        if (payload.ValueKind != JsonValueKind.Object)
            return null;

        foreach (var name in names)
        {
            if (!TryGetProperty(payload, name, out var element))
                continue;

            if (element.ValueKind == JsonValueKind.String &&
                Guid.TryParse(element.GetString(), out var guid))
                return guid;
        }

        return null;
    }

    private static string ResolveMessageId(
        BasicDeliverEventArgs args,
        Guid? envelopeEventId,
        string rawBody,
        string eventType)
    {
        if (!string.IsNullOrWhiteSpace(args.BasicProperties?.MessageId))
            return args.BasicProperties.MessageId!;

        if (envelopeEventId.HasValue)
            return envelopeEventId.Value.ToString("N");

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{eventType}|{rawBody}"));
        return Convert.ToHexString(hashBytes);
    }

    private static int GetRetryCount(IDictionary<string, object?>? headers)
    {
        if (headers is null)
        {
            return 0;
        }

        if (!headers.TryGetValue("X-Retry-Count", out var value) || value is null)
        {
            return 0;
        }

        return value switch
        {
            byte b => b,
            sbyte sb => sb,
            short s => s,
            ushort us => us,
            int i => i,
            long l => (int)l,
            byte[] bytes when int.TryParse(Encoding.UTF8.GetString(bytes), out var parsed) => parsed,
            ReadOnlyMemory<byte> memory when int.TryParse(Encoding.UTF8.GetString(memory.Span), out var parsed) => parsed,
            _ when int.TryParse(value.ToString(), out var parsed) => parsed,
            _ => 0
        };
    }

    private static Dictionary<string, object?> CloneHeaders(IDictionary<string, object?>? headers)
    {
        var clone = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (headers is null)
        {
            return clone;
        }

        foreach (var header in headers)
        {
            clone[header.Key] = header.Value;
        }

        return clone;
    }

    private async Task PublishRetryAsync(
        BasicDeliverEventArgs args,
        string eventType,
        string messageId,
        int retryCount,
        string errorMessage,
        CancellationToken ct)
    {
        if (_channel is null)
        {
            return;
        }

        var headers = CloneHeaders(args.BasicProperties?.Headers);
        headers["X-Retry-Count"] = retryCount;
        headers["EventType"] = eventType;
        headers["LastError"] = errorMessage;

        var props = new BasicProperties
        {
            MessageId = messageId,
            ContentType = args.BasicProperties?.ContentType ?? "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = headers
        };

        await _channel.BasicPublishAsync(
            exchange: _exchange,
            routingKey: args.RoutingKey,
            mandatory: false,
            basicProperties: props,
            body: args.Body,
            cancellationToken: ct);
    }

    private async Task PublishDeadLetterAsync(
        BasicDeliverEventArgs args,
        string eventType,
        string messageId,
        int retryCount,
        string errorMessage,
        CancellationToken ct)
    {
        if (_channel is null)
        {
            return;
        }

        var headers = CloneHeaders(args.BasicProperties?.Headers);
        headers["X-Retry-Count"] = retryCount;
        headers["EventType"] = eventType;
        headers["DeadLetterReason"] = errorMessage;
        headers["DeadLetteredAtUtc"] = DateTime.UtcNow.ToString("O");

        var props = new BasicProperties
        {
            MessageId = messageId,
            ContentType = args.BasicProperties?.ContentType ?? "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Headers = headers
        };

        await _channel.BasicPublishAsync(
            exchange: _deadLetterExchange,
            routingKey: _deadLetterRoutingKey,
            mandatory: false,
            basicProperties: props,
            body: args.Body,
            cancellationToken: ct);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel is not null)
            await _channel.DisposeAsync();

        if (_connection is not null)
            await _connection.DisposeAsync();

        await base.StopAsync(cancellationToken);
    }
}
