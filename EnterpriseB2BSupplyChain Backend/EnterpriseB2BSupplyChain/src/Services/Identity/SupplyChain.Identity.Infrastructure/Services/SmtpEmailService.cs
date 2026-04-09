using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;
using MimeKit.Text;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.Email;

namespace SupplyChain.Identity.Infrastructure.Services;

/// <summary>
/// MailKit-based implementation of <see cref="IEmailService"/>.
///
/// MailKit is the industry-recommended replacement for the obsolete
/// <c>System.Net.Mail.SmtpClient</c>. It supports modern TLS, true async I/O,
/// proper MIME handling, and is the explicit recommendation in Microsoft's docs:
/// https://learn.microsoft.com/en-us/dotnet/api/system.net.mail.smtpclient
///
/// All HTML emails are rendered through <see cref="HulEmailLayout"/> so they
/// share consistent HUL branding (header, footer, palette, typography).
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration            _configuration;
    private readonly IHostEnvironment          _environment;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(
        IConfiguration            configuration,
        IHostEnvironment          environment,
        ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _environment   = environment;
        _logger        = logger;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Public API (IEmailService)
    // ──────────────────────────────────────────────────────────────────────

    public async Task SendOtpAsync(
        string toEmail, string subject, string otpCode, string context, CancellationToken ct = default)
    {
        var (title, intro) = ResolveOtpCopy(context);
        var bodyHtml =
            HulEmailLayout.Greeting("there") +
            HulEmailLayout.Paragraph(intro) +
            HulEmailLayout.CodeCallout(otpCode, "Verification Code") +
            HulEmailLayout.Paragraph(
                "For your security, never share this code with anyone. " +
                "If you did not request this, you can safely ignore this email.") +
            HulEmailLayout.Signoff();

        var html = HulEmailLayout.Wrap(
            title:     title,
            bodyHtml:  bodyHtml,
            preheader: $"Your verification code is {otpCode}. Valid for 15 minutes.");

        await SendInternalAsync(toEmail, subject, html, ct, fallbackContext: $"OTP/{context}={otpCode}");
    }

    public async Task SendEmailAsync(
        string toEmail, string subject, string body, bool isHtml = false, CancellationToken ct = default)
    {
        // If the caller already provided full HTML (legacy handlers do), pass it through.
        // Otherwise, wrap plain text in a simple HUL-branded paragraph layout.
        var html = isHtml
            ? body
            : HulEmailLayout.Wrap(
                title:    subject,
                bodyHtml: HulEmailLayout.Paragraph(HulEmailLayout.Escape(body)) + HulEmailLayout.Signoff());

        await SendInternalAsync(toEmail, subject, html, ct, fallbackContext: subject);
    }

    // ──────────────────────────────────────────────────────────────────────
    // SMTP send (MailKit)
    // ──────────────────────────────────────────────────────────────────────

    private async Task SendInternalAsync(
        string toEmail, string subject, string htmlBody, CancellationToken ct, string fallbackContext)
    {
        var host        = _configuration["Email:SmtpHost"];
        var port        = int.TryParse(_configuration["Email:SmtpPort"], out var p) ? p : 587;
        var username    = _configuration["Email:Username"];
        var password    = _configuration["Email:Password"]?.Replace(" ", string.Empty);
        var fromAddress = _configuration["Email:FromAddress"] ?? username;
        var fromName    = _configuration["Email:FromName"]    ?? "HUL Supply Chain";

        if (string.IsNullOrWhiteSpace(host)
         || string.IsNullOrWhiteSpace(username)
         || string.IsNullOrWhiteSpace(password))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogWarning(
                    "SMTP settings missing. DEV email fallback for {Email} ({Subject}). Context: {Context}",
                    toEmail, subject, fallbackContext);
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

        // Helpful headers for deliverability
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
                    "SMTP send failed. DEV email fallback for {Email} ({Subject}). Context: {Context}",
                    toEmail, subject, fallbackContext);
                return;
            }
            _logger.LogError(ex, "SMTP send failed for {Email} ({Subject})", toEmail, subject);
            throw new InvalidOperationException(
                "Failed to send email. Verify SMTP credentials (use a Gmail App Password if using Gmail) " +
                "and that SMTP authentication is enabled for the account.", ex);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Copy resolver
    // ──────────────────────────────────────────────────────────────────────

    /// <summary>Maps OTP context strings (e.g. "dealer login") to friendly title + intro copy.</summary>
    private static (string Title, string Intro) ResolveOtpCopy(string context)
    {
        var key = (context ?? string.Empty).ToLowerInvariant().Trim();
        return key switch
        {
            "dealer registration" => (
                "Verify Your Email",
                "Welcome to the HUL Supply Chain Platform! Please use the verification code below to complete your dealer registration."),
            "dealer login" => (
                "Sign-In Verification",
                "Please use the verification code below to securely sign in to your dealer account."),
            "forgot password" => (
                "Password Reset Request",
                "We received a request to reset your password. Use the verification code below to proceed."),
            _ => (
                "Verification Required",
                "Please use the verification code below to continue."),
        };
    }
}
