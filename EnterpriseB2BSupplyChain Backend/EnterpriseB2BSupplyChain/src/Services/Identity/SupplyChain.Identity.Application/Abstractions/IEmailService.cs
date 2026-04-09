namespace SupplyChain.Identity.Application.Abstractions;

public interface IEmailService
{
    Task SendOtpAsync(string toEmail, string subject, string otpCode, string context, CancellationToken ct = default);
    Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = false, CancellationToken ct = default);
}