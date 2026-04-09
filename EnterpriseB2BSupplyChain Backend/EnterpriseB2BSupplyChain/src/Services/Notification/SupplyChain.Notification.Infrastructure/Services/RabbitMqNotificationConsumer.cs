using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Application.Services;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Services;

public class RabbitMqNotificationConsumer : BackgroundService
{
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RabbitMqNotificationConsumer> _logger;

    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqNotificationConsumer(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<RabbitMqNotificationConsumer> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var host = _configuration["RabbitMQ:Host"] ?? "localhost";
        var username = _configuration["RabbitMQ:Username"] ?? "guest";
        var password = _configuration["RabbitMQ:Password"] ?? "guest";
        var exchange = _configuration["RabbitMQ:Exchange"] ?? "supplychain.domain.events";
        var queue = _configuration["RabbitMQ:Queue"] ?? "notification.email.queue";
        var routingKey = _configuration["RabbitMQ:RoutingKey"] ?? "#";

        var factory = new ConnectionFactory
        {
            HostName = host,
            UserName = username,
            Password = password
        };

        _connection = await factory.CreateConnectionAsync(cancellationToken: stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await _channel.ExchangeDeclareAsync(
            exchange: exchange,
            type: ExchangeType.Topic,
            durable: true,
            cancellationToken: stoppingToken);

        await _channel.QueueDeclareAsync(
            queue: queue,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: stoppingToken);

        await _channel.QueueBindAsync(
            queue: queue,
            exchange: exchange,
            routingKey: routingKey,
            cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, args) => await HandleMessageAsync(args, stoppingToken);

        await _channel.BasicConsumeAsync(
            queue: queue,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        _logger.LogInformation("Notification consumer started. Queue: {Queue}", queue);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleMessageAsync(BasicDeliverEventArgs args, CancellationToken ct)
    {
        if (_channel is null)
            return;

        var payload = Encoding.UTF8.GetString(args.Body.ToArray());
        var eventType = GetEventType(args);

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            var templateData = ToTemplateData(root);
            AddTemplateAliases(templateData);

            using var scope = _scopeFactory.CreateScope();
            var dispatch = scope.ServiceProvider.GetRequiredService<EmailDispatchService>();
            var inboxRepo = scope.ServiceProvider.GetRequiredService<INotificationInboxRepository>();

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

            await _channel.BasicAckAsync(args.DeliveryTag, false, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed processing notification event. EventType: {EventType}", eventType);
            await _channel.BasicNackAsync(args.DeliveryTag, false, requeue: true, cancellationToken: ct);
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

            Guid? dealerId = Guid.TryParse(dealerIdStr, out var did) ? did : null;
            Guid? agentId  = Guid.TryParse(agentIdStr,  out var aid) ? aid : null;

            (string? title, string? message, string? type) = eventType switch
            {
                "OrderPlaced" =>
                    ($"Order {orderNumber} Confirmed",
                     $"Your order {orderNumber} has been placed successfully.",
                     "Order"),

                "AdminApprovalRequired" =>
                    ($"Order {orderNumber} On Hold",
                     $"Order {orderNumber} is on hold pending admin approval.",
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

                "InvoiceGenerated" =>
                    ($"Invoice Ready — {orderNumber}",
                     $"Your invoice for order {orderNumber} is ready. Download from the portal.",
                     "Payment"),

                "ShipmentStatusUpdated" =>
                    ($"Delivery Update — {orderNumber}",
                     $"Order {orderNumber} delivery status has been updated.",
                     "Logistics"),

                "VehicleBreakdown" =>
                    ($"Delivery Delay — {orderNumber}",
                     $"Your order {orderNumber} has been delayed due to a vehicle breakdown. Our team will update you shortly. For queries contact the delivery agent directly.",
                     "Logistics"),

                "SLAAtRisk" =>
                    ($"Delivery Update — {orderNumber}",
                     $"Your order {orderNumber} may experience a slight delay. We are working to deliver it as soon as possible.",
                     "Logistics"),

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
            if (eventType == "AgentAssigned" && agentId.HasValue && agentId.Value != Guid.Empty)
            {
                var agentTitle = $"New Assignment — Order {orderNumber}";
                var agentMsg   = $"You have been assigned Order {orderNumber}. Please pick up from warehouse.";
                var agentNotif = NotificationInbox.Create(agentId.Value, agentTitle, agentMsg, "Logistics");
                await inboxRepo.AddAsync(agentNotif, ct);
                await inboxRepo.SaveChangesAsync(ct);
            }

            // Agent inbox — for ShipmentStatusUpdated / VehicleBreakdown / SLAAtRisk
            if (eventType is "ShipmentStatusUpdated" or "VehicleBreakdown" or "SLAAtRisk"
                && agentId.HasValue && agentId.Value != Guid.Empty)
            {
                var agentNotif = NotificationInbox.Create(agentId.Value, title, message, type!);
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
        CopyAlias(data, "AgentName", "agent_name");
        CopyAlias(data, "AgentPhone", "agent_phone");
        CopyAlias(data, "VehicleNo", "vehicle_no");
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
