namespace SupplyChain.Identity.Application.Abstractions;

/// <summary>
/// Abstraction for fire-and-forget OTP email dispatch via a background queue.
/// Decouples application handlers from Hangfire (infrastructure concern) while
/// keeping the Application layer free of any Hangfire package references.
/// </summary>
public interface IEmailBackgroundJobDispatcher
{
    /// <summary>
    /// Enqueues an OTP email for asynchronous delivery.
    /// The OTP record must already be persisted before calling this method
    /// so that a retry of the background job can safely re-read it.
    /// </summary>
    void EnqueueOtp(string toEmail, string subject, string otpCode, string context);
}
