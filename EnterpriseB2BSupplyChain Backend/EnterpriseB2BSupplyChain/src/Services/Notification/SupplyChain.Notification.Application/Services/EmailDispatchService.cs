using Microsoft.Extensions.Logging;
using Scriban;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Application.Services;

public class EmailDispatchService
{
    private readonly INotificationRepository _repository;
    private readonly IEmailSender            _emailSender;
    private readonly ILogger<EmailDispatchService> _logger;

    public EmailDispatchService(
        INotificationRepository repository,
        IEmailSender            emailSender,
        ILogger<EmailDispatchService> logger)
    {
        _repository  = repository;
        _emailSender = emailSender;
        _logger      = logger;
    }

    public async Task DispatchAsync(
        string              eventType,
        string              recipientEmail,
        Dictionary<string,  object?> templateData,
        CancellationToken   ct = default)
    {
        var template = await _repository.GetTemplateByEventTypeAsync(eventType, ct);

        if (template is null || !template.IsActive)
        {
            _logger.LogWarning("No active template for event type: {EventType}", eventType);
            return;
        }

        var parsedSubject = Template.Parse(template.Subject);
        var parsedBody    = Template.Parse(template.HtmlBody);

        var renderedSubject = await parsedSubject.RenderAsync(templateData);
        var renderedBody    = await parsedBody.RenderAsync(templateData);

        var log = NotificationLog.Create(eventType, recipientEmail, renderedSubject);

        try
        {
            await _emailSender.SendAsync(recipientEmail, renderedSubject, renderedBody, ct);
            log.MarkSent();
            _logger.LogInformation("Email sent for {EventType} to {Email}", eventType, recipientEmail);
        }
        catch (Exception ex)
        {
            log.MarkFailed(ex.Message);
            _logger.LogError(ex, "Failed to send email for {EventType} to {Email}", eventType, recipientEmail);
        }

        await _repository.AddLogAsync(log, ct);
        await _repository.SaveChangesAsync(ct);
    }
}
