using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Application.Services;
using SupplyChain.Notification.Domain.Entities;
using SupplyChain.Notification.Infrastructure.Persistence;

namespace SupplyChain.Notification.Infrastructure.Services;

public class RabbitMqNotificationConsumer : BackgroundService
{
    private const string ConsumerName = "notification-email-consumer";

    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RabbitMqNotificationConsumer> _logger;
    private readonly int _maxRetries;

    private IConnection? _connection;
    private IChannel? _channel;
    private string _exchange = "supplychain.domain.events";
    private string _queue = "notification.email.queue";
    private string _routingKey = "#";
    private string _deadLetterExchange = "supplychain.domain.events.dead";
    private string _deadLetterQueue = "notification.email.queue.dead";
    private string _deadLetterRoutingKey = "notification.email.queue.dead";

    public RabbitMqNotificationConsumer(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<RabbitMqNotificationConsumer> logger)
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
        _queue = _configuration["RabbitMQ:Queue"] ?? "notification.email.queue";
        _routingKey = _configuration["RabbitMQ:RoutingKey"] ?? "#";
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
            "Notification consumer started. Queue: {Queue}, DLQ: {DeadLetterQueue}, MaxRetries: {MaxRetries}",
            _queue, _deadLetterQueue, _maxRetries);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleMessageAsync(BasicDeliverEventArgs args, CancellationToken ct)
    {
        if (_channel is null)
            return;

        var rawBody = Encoding.UTF8.GetString(args.Body.ToArray());
        var headerEventType = GetEventType(args);
        var (eventType, correlationId, envelopeEventId, payloadRoot) = ParseEnvelope(rawBody, headerEventType);
        var messageId = ResolveMessageId(args, envelopeEventId, rawBody, eventType);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
            var dispatch = scope.ServiceProvider.GetRequiredService<EmailDispatchService>();
            var inboxRepo = scope.ServiceProvider.GetRequiredService<INotificationInboxRepository>();

            var alreadyProcessed = await db.ConsumedMessages
                .AnyAsync(x => x.MessageId == messageId && x.Consumer == ConsumerName, ct);
            if (alreadyProcessed)
            {
                await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                return;
            }

            var templateData = ToTemplateData(payloadRoot);
            if (!string.IsNullOrWhiteSpace(correlationId))
                templateData["correlationId"] = correlationId;
            AddTemplateAliases(templateData);

            if (eventType.Equals("AgentAssigned", StringComparison.OrdinalIgnoreCase))
            {
                var dealerRecipient = FirstValue(templateData, "dealerEmail", "recipientEmail", "email", "adminEmail");
                var agentRecipient = FirstValue(templateData, "agentEmail");

                if (string.IsNullOrWhiteSpace(dealerRecipient) && string.IsNullOrWhiteSpace(agentRecipient))
                {
                    _logger.LogWarning("Skipping event {EventType}. No dealer or agent recipient email in payload.", eventType);
                    await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                    return;
                }

                if (!string.IsNullOrWhiteSpace(dealerRecipient))
                    await dispatch.DispatchAsync("AgentAssigned", dealerRecipient, templateData, ct);

                if (!string.IsNullOrWhiteSpace(agentRecipient))
                    await dispatch.DispatchAsync("AgentAssignedToAgent", agentRecipient, templateData, ct);

                // Write inbox for dealer
                await WriteInboxAsync(inboxRepo, templateData, eventType, ct);
            }
            else
            {
                var recipient = FirstValue(templateData, "recipientEmail", "email", "dealerEmail", "adminEmail");

                if (string.IsNullOrWhiteSpace(recipient))
                {
                    _logger.LogWarning("Skipping event {EventType}. No recipient email in payload.", eventType);
                    await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
                    return;
                }

                await dispatch.DispatchAsync(eventType, recipient, templateData, ct);

                // Write inbox notification for relevant events
                await WriteInboxAsync(inboxRepo, templateData, eventType, ct);
            }

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
                    "Notification event moved to DLQ. EventType={EventType}, MessageId={MessageId}, Retries={Retries}",
                    eventType, messageId, nextRetry - 1);
            }
            else
            {
                await PublishRetryAsync(args, eventType, messageId, nextRetry, ex.Message, ct);
                _logger.LogWarning(ex,
                    "Notification event retry queued. EventType={EventType}, MessageId={MessageId}, Retry={Retry}/{MaxRetries}",
                    eventType, messageId, nextRetry, _maxRetries);
            }

            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
    }

    private async Task WriteInboxAsync(
        INotificationInboxRepository inboxRepo,
        Dictionary<string, object?> data,
        string eventType,
        CancellationToken ct)
    {
        try
        {
            var orderNumber = data.TryGetValue("OrderNumber", out var on) ? on?.ToString() : null;
            var dealerIdStr = data.TryGetValue("DealerId", out var di) ? di?.ToString() : null;
            var agentIdStr  = data.TryGetValue("AgentId",  out var ai) ? ai?.ToString() : null;
            var agentUserIdStr = data.TryGetValue("AgentUserId", out var aui) ? aui?.ToString() : null;
            var status      = data.TryGetValue("Status", out var st) ? st?.ToString() : null;
            var place       = data.TryGetValue("Place", out var pl) ? pl?.ToString() : null;
            var productName = FirstValue(data, "ProductName", "productName", "product_name", "Name") ?? "Selected product";

            Guid? dealerId = Guid.TryParse(dealerIdStr, out var did) ? did : null;
            Guid? agentId  = Guid.TryParse(agentIdStr,  out var aid) ? aid : null;
            Guid? agentUserId = Guid.TryParse(agentUserIdStr, out var auiParsed) ? auiParsed : null;
            var inboxAgentOwnerId = agentUserId is { } validAgentUserId && validAgentUserId != Guid.Empty
                ? validAgentUserId
                : agentId;

            (string? title, string? message, string? type) = eventType switch
            {
                "OrderPlaced" =>
                    ($"Order {orderNumber} Confirmed",
                     $"Your order {orderNumber} has been placed successfully.",
                     "Order"),

                "QuotaExceededReview" =>
                    ($"Order {orderNumber} Under Review",
                     $"Payment Verified! Your order {orderNumber} is currently Under Review as it exceeds your Monthly Purchase Limit.",
                     "Order"),

                "AdminApprovalRequired" =>
                    ($"Order {orderNumber} On Hold",
                     $"Order {orderNumber} exceeded monthly purchase limit and is waiting for admin approval.",
                     "Order"),

                "AgentAssigned" =>
                    ($"Order {orderNumber} Dispatched",
                     $"Delivery agent has been assigned to your order {orderNumber}. Check order details for agent info.",
                     "Logistics"),

                "OrderDelivered" =>
                    ($"Order {orderNumber} Delivered",
                     $"Your order {orderNumber} has been delivered successfully.",
                     "Order"),

                "OrderCancelled" =>
                    ($"Order {orderNumber} Cancelled",
                     $"Your order {orderNumber} has been cancelled.",
                     "Order"),

                "ReturnApproved" =>
                    ($"Return Approved — {orderNumber}",
                     $"Your return request for order {orderNumber} has been approved and refund processing has started.",
                     "Order"),

                "ReturnRejected" =>
                    ($"Return Rejected — {orderNumber}",
                     $"Your return request for order {orderNumber} was rejected. Check admin notes for details.",
                     "Order"),

                "InvoiceGenerated" =>
                    ($"Invoice Ready — {orderNumber}",
                     $"Your invoice for order {orderNumber} is ready. Download from the portal.",
                     "Payment"),

                "ShipmentStatusUpdated" =>
                    ($"Delivery Update — {orderNumber}",
                     $"Order {orderNumber} is now {(string.IsNullOrWhiteSpace(status) ? "updated" : status)}{(string.IsNullOrWhiteSpace(place) ? "." : $" at {place}.")}",
                     "Logistics"),

                "VehicleBreakdown" =>
                    ($"Delivery Delay — {orderNumber}",
                     $"Your order {orderNumber} has been delayed due to a vehicle breakdown. Our team will update you shortly. For queries contact the delivery agent directly.",
                     "Logistics"),

                "SLAAtRisk" =>
                    ($"Delivery Update — {orderNumber}",
                     $"Your order {orderNumber} may experience a slight delay. We are working to deliver it as soon as possible.",
                     "Logistics"),

                "StockRestored" =>
                    ($"Back in Stock - {productName}",
                     $"Good news. {productName} is back in stock and available to order.",
                     "Catalog"),

                _ => (null, null, null)
            };

            if (title == null || message == null)
                return;

            // Dealer inbox
            if (dealerId.HasValue && dealerId.Value != Guid.Empty)
            {
                var notification = NotificationInbox.Create(dealerId.Value, title, message, type!);
                await inboxRepo.AddAsync(notification, ct);
                await inboxRepo.SaveChangesAsync(ct);
            }

            // Admin inbox — use a well-known placeholder for admin broadcast
            // Admin reads notifications via their userId, so we write for adminId if present
            var adminIdStr = data.TryGetValue("AdminId", out var adm) ? adm?.ToString() : null;
            if (Guid.TryParse(adminIdStr, out var adminId) && adminId != Guid.Empty)
            {
                var adminNotif = NotificationInbox.Create(adminId, title, message, type!);
                await inboxRepo.AddAsync(adminNotif, ct);
                await inboxRepo.SaveChangesAsync(ct);
            }

            // Agent inbox — for AgentAssigned event
            if (eventType == "AgentAssigned" && inboxAgentOwnerId.HasValue && inboxAgentOwnerId.Value != Guid.Empty)
            {
                var agentTitle = $"New Assignment — Order {orderNumber}";
                var agentMsg   = $"You have been assigned Order {orderNumber}. Please pick up from warehouse.";
                var agentNotif = NotificationInbox.Create(inboxAgentOwnerId.Value, agentTitle, agentMsg, "Logistics");
                await inboxRepo.AddAsync(agentNotif, ct);
                await inboxRepo.SaveChangesAsync(ct);
            }

            // Agent inbox — for ShipmentStatusUpdated / VehicleBreakdown / SLAAtRisk
            if (eventType is "ShipmentStatusUpdated" or "VehicleBreakdown" or "SLAAtRisk"
                && inboxAgentOwnerId.HasValue && inboxAgentOwnerId.Value != Guid.Empty)
            {
                var agentNotif = NotificationInbox.Create(inboxAgentOwnerId.Value, title, message, type!);
                await inboxRepo.AddAsync(agentNotif, ct);
                await inboxRepo.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write inbox notification for event {EventType}", eventType);
        }
    }

    private static string GetEventType(BasicDeliverEventArgs args)
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

    private static string? FirstValue(Dictionary<string, object?> data, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!data.TryGetValue(key, out var value) || value is null)
                continue;

            var stringValue = value.ToString();
            if (!string.IsNullOrWhiteSpace(stringValue))
                return stringValue;
        }

        return null;
    }

    private static Dictionary<string, object?> ToTemplateData(JsonElement root)
    {
        var data = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (root.ValueKind != JsonValueKind.Object)
            return data;

        foreach (var property in root.EnumerateObject())
        {
            data[property.Name] = property.Value.ValueKind switch
            {
                JsonValueKind.String => property.Value.GetString(),
                JsonValueKind.Number => property.Value.TryGetInt64(out var i) ? i : property.Value.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => property.Value.ToString()
            };
        }

        return data;
    }

    private static void AddTemplateAliases(Dictionary<string, object?> data)
    {
        CopyAlias(data, "OrderNumber", "order_number");
        CopyAlias(data, "DealerName", "dealer_name");
        CopyAlias(data, "DealerEmail", "dealer_email");
        CopyAlias(data, "Status", "status");
        CopyAlias(data, "TotalAmount", "total_amount");
        CopyAlias(data, "RefundAmount", "refund_amount");
        CopyAlias(data, "GrandTotal", "grand_total");
        CopyAlias(data, "Amount", "amount");
        CopyAlias(data, "AgentName", "agent_name");
        CopyAlias(data, "AgentPhone", "agent_phone");
        CopyAlias(data, "VehicleNo", "vehicle_no");
        CopyAlias(data, "VehicleRegistrationNo", "vehicle_registration_no");
        CopyAlias(data, "VehicleType", "vehicle_type");
        CopyAlias(data, "Place", "place");
        CopyAlias(data, "Notes", "notes");
        CopyAlias(data, "UpdatedAt", "updated_at");
        CopyAlias(data, "RecordedAt", "updated_at");
        CopyAlias(data, "ShippingAddressLine", "shipping_address");
        CopyAlias(data, "ShippingCity", "shipping_city");
        CopyAlias(data, "ShippingPinCode", "shipping_pincode");
    }

    private static void CopyAlias(Dictionary<string, object?> data, string source, string target)
    {
        if (!data.TryGetValue(target, out var existing) || string.IsNullOrWhiteSpace(existing?.ToString()))
        {
            if (data.TryGetValue(source, out var sourceValue))
                data[target] = sourceValue;
        }
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
