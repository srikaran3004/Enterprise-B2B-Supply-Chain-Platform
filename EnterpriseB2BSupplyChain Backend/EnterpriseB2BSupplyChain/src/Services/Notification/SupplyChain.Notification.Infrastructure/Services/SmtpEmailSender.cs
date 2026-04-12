using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;
using MimeKit.Text;
using SupplyChain.Notification.Application.Abstractions;
using System.Linq;

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
        var host = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_SMTP_HOST"),
            Environment.GetEnvironmentVariable("SMTP_HOST"),
            _config["Email:SmtpHost"]);

        var portText = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_SMTP_PORT"),
            Environment.GetEnvironmentVariable("SMTP_PORT"),
            _config["Email:SmtpPort"]);
        var port = int.TryParse(portText, out var p) ? p : 587;

        var username = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_USERNAME"),
            Environment.GetEnvironmentVariable("SMTP_USERNAME"),
            Environment.GetEnvironmentVariable("SMTP_USER"),
            _config["Email:Username"]);

        var password = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_PASSWORD"),
            Environment.GetEnvironmentVariable("SMTP_PASSWORD"),
            _config["Email:Password"]);
        password = password?.Replace(" ", string.Empty);

        var fromAddress = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_FROM"),
            Environment.GetEnvironmentVariable("SMTP_FROM"),
            _config["Email:FromAddress"],
            username);

        var fromName = FirstNonEmpty(
            Environment.GetEnvironmentVariable("EMAIL_FROM_NAME"),
            _config["Email:FromName"],
            "HUL Supply Chain");

        if (LooksLikePlaceholder(username) || LooksLikePlaceholder(password))
        {
            username = null;
            password = null;
        }

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

    private static string? FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static bool LooksLikePlaceholder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "your-email@gmail.com" or "your-app-password"
            || normalized.Contains("your-email")
            || normalized.Contains("your-app-password");
    }
}
