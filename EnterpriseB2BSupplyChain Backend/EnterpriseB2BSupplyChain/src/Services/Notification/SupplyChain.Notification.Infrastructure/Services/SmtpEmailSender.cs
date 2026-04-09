using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;
using MimeKit.Text;
using SupplyChain.Notification.Application.Abstractions;

namespace SupplyChain.Notification.Infrastructure.Services;

/// <summary>
/// MailKit-based implementation of <see cref="IEmailSender"/>.
///
/// Uses MailKit + MimeKit (the industry-standard, Microsoft-recommended replacement
/// for the obsolete <c>System.Net.Mail.SmtpClient</c>). Sends fully HTML-formatted
/// emails composed by <c>EmailDispatchService</c> from the DB-backed templates seeded
/// in <c>NotificationSeeder</c>.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration           _config;
    private readonly IHostEnvironment         _environment;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IConfiguration           config,
        IHostEnvironment         environment,
        ILogger<SmtpEmailSender> logger)
    {
        _config      = config;
        _environment = environment;
        _logger      = logger;
    }

    public async Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken ct = default)
    {
        var host        = _config["Email:SmtpHost"];
        var port        = int.TryParse(_config["Email:SmtpPort"], out var p) ? p : 587;
        var username    = _config["Email:Username"];
        var password    = _config["Email:Password"]?.Replace(" ", string.Empty);
        var fromAddress = _config["Email:FromAddress"] ?? username;
        var fromName    = _config["Email:FromName"]    ?? "HUL Supply Chain";

        if (string.IsNullOrWhiteSpace(host)
         || string.IsNullOrWhiteSpace(username)
         || string.IsNullOrWhiteSpace(password))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogWarning(
                    "SMTP settings missing. DEV email fallback for {Email}: {Subject}",
                    toEmail, subject);
                return;
            }
            throw new InvalidOperationException(
                "Email SMTP settings are missing. Configure the 'Email' section in appsettings.");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress!));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart(TextFormat.Html) { Text = htmlBody };
        message.Headers.Add("X-Mailer",  "HUL Supply Chain Platform");
        message.Headers.Add("X-Priority", "3");

        try
        {
            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls, ct);
            await smtp.AuthenticateAsync(username, password, ct);
            await smtp.SendAsync(message, ct);
            await smtp.DisconnectAsync(true, ct);

            _logger.LogInformation("Email sent to {Email} | Subject: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogWarning(ex,
                    "SMTP send failed. DEV email fallback for {Email}: {Subject}", toEmail, subject);
                return;
            }
            _logger.LogError(ex, "SMTP send failed for {Email} ({Subject})", toEmail, subject);
            throw new InvalidOperationException(
                "Failed to send email. Verify SMTP credentials (use a Gmail App Password if using Gmail) " +
                "and that SMTP authentication is enabled for the account.", ex);
        }
    }
}
