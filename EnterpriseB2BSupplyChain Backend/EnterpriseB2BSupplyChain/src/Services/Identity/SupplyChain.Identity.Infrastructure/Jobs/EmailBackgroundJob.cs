using Hangfire;
using SupplyChain.Identity.Application.Abstractions;

namespace SupplyChain.Identity.Infrastructure.Jobs;

/// <summary>
/// Hangfire job class that acts as the actual execution target for
/// fire-and-forget OTP emails. Using a dedicated job class (rather than
/// targeting IEmailService directly) avoids the CancellationToken
/// serialization error that Hangfire would otherwise throw.
/// </summary>
public class EmailBackgroundJob
{
    private readonly IEmailService _emailService;

    public EmailBackgroundJob(IEmailService emailService)
        => _emailService = emailService;

    // No CancellationToken — Hangfire cannot serialize CancellationToken.
    // Hangfire retries are controlled by [AutomaticRetry] on the job itself.
    public async Task SendOtpAsync(string toEmail, string subject, string otpCode, string context)
        => await _emailService.SendOtpAsync(toEmail, subject, otpCode, context);
}

/// <summary>
/// Infrastructure implementation of IEmailBackgroundJobDispatcher.
/// Enqueues email delivery as a Hangfire fire-and-forget background job.
/// </summary>
public class HangfireEmailBackgroundJobDispatcher : IEmailBackgroundJobDispatcher
{
    public void EnqueueOtp(string toEmail, string subject, string otpCode, string context)
        => BackgroundJob.Enqueue<EmailBackgroundJob>(
            x => x.SendOtpAsync(toEmail, subject, otpCode, context));
}
