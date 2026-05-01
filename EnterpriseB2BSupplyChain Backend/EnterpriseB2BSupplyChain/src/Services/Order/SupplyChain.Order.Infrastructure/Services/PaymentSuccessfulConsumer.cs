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
using SupplyChain.Order.Application.Commands.ConfirmOrderPayment;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Infrastructure.Persistence;

namespace SupplyChain.Order.Infrastructure.Services;

public class PaymentSuccessfulConsumer : BackgroundService
{
    private const string ConsumerName = "order-payment-consumer";

    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PaymentSuccessfulConsumer> _logger;
    private readonly int _maxRetries;

    private IConnection? _connection;
    private IChannel? _channel;
    private string _exchange = "supplychain.domain.events";
    private string _queue = "order.payment.queue";
    private string _routingKey = "PaymentSuccessful";
    private string _deadLetterExchange = "supplychain.domain.events.dead";
    private string _deadLetterQueue = "order.payment.queue.dead";
    private string _deadLetterRoutingKey = "order.payment.queue.dead";

    public PaymentSuccessfulConsumer(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<PaymentSuccessfulConsumer> logger)
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
        _queue = _configuration["RabbitMQ:PaymentQueue"] ?? "order.payment.queue";
        _routingKey = "payment.paymentsuccessful";
        _deadLetterExchange = _configuration["RabbitMQ:DeadLetterExchange"] ?? $"{_exchange}.dead";
        _deadLetterQueue = _configuration["RabbitMQ:PaymentDeadLetterQueue"] ?? $"{_queue}.dead";
        _deadLetterRoutingKey = _configuration["RabbitMQ:PaymentDeadLetterRoutingKey"] ?? $"{_queue}.dead";

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
            "PaymentSuccessful consumer started. Queue: {Queue}, DLQ: {DeadLetterQueue}",
            _queue, _deadLetterQueue);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleMessageAsync(BasicDeliverEventArgs args, CancellationToken ct)
    {
        if (_channel is null) return;

        var rawBody = Encoding.UTF8.GetString(args.Body.ToArray());
        var eventType = GetEventType(args);
        var (parsedEventType, correlationId, envelopeEventId, payloadRoot) = ParseEnvelope(rawBody, eventType);
        var messageId = ResolveMessageId(args, envelopeEventId, rawBody, parsedEventType);

        if (!parsedEventType.Equals("PaymentSuccessful", StringComparison.OrdinalIgnoreCase) &&
            !parsedEventType.Equals("payment.paymentsuccessful", StringComparison.OrdinalIgnoreCase))
        {
            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            var orderId = TryReadGuid(payloadRoot, "OrderId", "orderId");
            var dealerId = TryReadGuid(payloadRoot, "DealerId", "dealerId");
            var amount = TryReadDecimal(payloadRoot, "Amount", "amount");

            if (orderId.HasValue && dealerId.HasValue && amount.HasValue)
            {
                _logger.LogInformation(
                    "Processing PaymentSuccessful event: OrderId={OrderId}, DealerId={DealerId}, Amount={Amount}, MessageId={MessageId}",
                    orderId.Value, dealerId.Value, amount.Value, messageId);

                await mediator.Send(new ConfirmOrderPaymentCommand(orderId.Value, dealerId.Value, amount.Value), ct);

                _logger.LogInformation(
                    "Successfully processed PaymentSuccessful event for OrderId={OrderId}",
                    orderId.Value);
            }
            else
            {
                _logger.LogError(
                    "Failed to parse PaymentSuccessful event payload. HasOrderId={HasOrderId}, HasDealerId={HasDealerId}, HasAmount={HasAmount}, Payload={Payload}",
                    orderId.HasValue, dealerId.HasValue, amount.HasValue, payloadRoot.GetRawText());
            }

            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error processing PaymentSuccessful event. MessageId={MessageId}, EventType={EventType}, RetryCount={RetryCount}",
                messageId, parsedEventType, GetRetryCount(args.BasicProperties?.Headers));

            var nextRetry = GetRetryCount(args.BasicProperties?.Headers) + 1;
            if (nextRetry > _maxRetries)
            {
                _logger.LogError(
                    "Max retries exceeded for PaymentSuccessful event. Moving to dead letter queue. MessageId={MessageId}, Retries={Retries}",
                    messageId, nextRetry);
                await PublishDeadLetterAsync(args, parsedEventType, messageId, nextRetry, ex.Message, ct);
            }
            else
            {
                _logger.LogWarning(
                    "Retrying PaymentSuccessful event. MessageId={MessageId}, Retry={Retry}/{MaxRetries}",
                    messageId, nextRetry, _maxRetries);
                await PublishRetryAsync(args, parsedEventType, messageId, nextRetry, ex.Message, ct);
            }
            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
    }

    private static string GetEventType(BasicDeliverEventArgs args)
    {
        if (args.BasicProperties?.Headers is not null &&
            args.BasicProperties.Headers.TryGetValue("EventType", out var value))
        {
            if (value is byte[] bytes) return Encoding.UTF8.GetString(bytes);
            if (value is ReadOnlyMemory<byte> memory) return Encoding.UTF8.GetString(memory.Span);
            if (value is string text) return text;
        }
        return args.RoutingKey;
    }

    private static (string EventType, string? CorrelationId, Guid? EventId, JsonElement Payload) ParseEnvelope(
        string rawBody, string fallbackEventType)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object &&
                TryGetProperty(root, "payload", out var payloadElement) &&
                payloadElement.ValueKind == JsonValueKind.Object)
            {
                var eventType = TryGetProperty(root, "eventType", out var evt) ? evt.GetString() ?? fallbackEventType : fallbackEventType;
                string? correlationId = TryGetProperty(root, "correlationId", out var cid) && cid.ValueKind == JsonValueKind.String ? cid.GetString() : null;
                Guid? eventId = TryGetProperty(root, "eventId", out var idElement) && idElement.ValueKind == JsonValueKind.String && Guid.TryParse(idElement.GetString(), out var parsedId) ? parsedId : null;
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
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }
        }

        value = default;
        return false;
    }

    private static Guid? TryReadGuid(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryGetProperty(element, propertyName, out var value))
                continue;

            if (value.ValueKind == JsonValueKind.String && Guid.TryParse(value.GetString(), out var parsed))
                return parsed;
        }

        return null;
    }

    private static decimal? TryReadDecimal(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryGetProperty(element, propertyName, out var value))
                continue;

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var numeric))
                return numeric;

            if (value.ValueKind == JsonValueKind.String && decimal.TryParse(value.GetString(), out var parsed))
                return parsed;
        }

        return null;
    }

    private static string ResolveMessageId(BasicDeliverEventArgs args, Guid? envelopeEventId, string rawBody, string eventType)
    {
        if (!string.IsNullOrWhiteSpace(args.BasicProperties?.MessageId)) return args.BasicProperties.MessageId!;
        if (envelopeEventId.HasValue) return envelopeEventId.Value.ToString("N");
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{eventType}|{rawBody}"));
        return Convert.ToHexString(hashBytes);
    }

    private static int GetRetryCount(IDictionary<string, object?>? headers)
    {
        if (headers is null || !headers.TryGetValue("X-Retry-Count", out var value) || value is null) return 0;
        return value switch
        {
            byte b => b, int i => i, string s when int.TryParse(s, out var parsed) => parsed,
            byte[] bytes when int.TryParse(Encoding.UTF8.GetString(bytes), out var p) => p,
            _ => 0
        };
    }

    private async Task PublishRetryAsync(BasicDeliverEventArgs args, string eventType, string messageId, int retryCount, string errorMessage, CancellationToken ct)
    {
        if (_channel is null) return;
        var headers = CloneHeaders(args.BasicProperties?.Headers);
        headers["X-Retry-Count"] = retryCount;
        headers["EventType"] = eventType;
        headers["LastError"] = errorMessage;
        var props = new BasicProperties { MessageId = messageId, DeliveryMode = DeliveryModes.Persistent, Headers = headers };
        await _channel.BasicPublishAsync(_exchange, args.RoutingKey, false, props, args.Body, ct);
    }

    private async Task PublishDeadLetterAsync(BasicDeliverEventArgs args, string eventType, string messageId, int retryCount, string errorMessage, CancellationToken ct)
    {
        if (_channel is null) return;
        var headers = CloneHeaders(args.BasicProperties?.Headers);
        headers["X-Retry-Count"] = retryCount;
        headers["EventType"] = eventType;
        headers["DeadLetterReason"] = errorMessage;
        var props = new BasicProperties { MessageId = messageId, DeliveryMode = DeliveryModes.Persistent, Headers = headers };
        await _channel.BasicPublishAsync(_deadLetterExchange, _deadLetterRoutingKey, false, props, args.Body, ct);
    }

    private static Dictionary<string, object?> CloneHeaders(IDictionary<string, object?>? headers)
    {
        var clone = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (headers is not null) foreach (var h in headers) clone[h.Key] = h.Value;
        return clone;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel is not null) await _channel.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
        await base.StopAsync(cancellationToken);
    }
}
