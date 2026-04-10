namespace SupplyChain.SharedInfrastructure.Exceptions;

/// <summary>
/// Abstract base class for all application-level exceptions that are
/// intentionally thrown by handlers/domain services and should be translated
/// into a user-friendly HTTP response by the global exception middleware.
///
/// Subclasses carry their own HTTP status code and machine-readable error code.
/// This is intentionally separate from the per-service <c>DomainException</c>
/// classes â€” those represent pure domain invariant violations and remain
/// untouched to avoid a cross-cutting refactor of every Domain project.
/// The global middleware handles BOTH hierarchies.
/// </summary>
public abstract class AppException : Exception
{
    /// <summary>HTTP status code to emit when this exception bubbles up to the middleware.</summary>
    public int StatusCode { get; }

    /// <summary>Short machine-readable error code (e.g. "NOT_FOUND", "VALIDATION_FAILED").</summary>
    public string ErrorCode { get; }

    protected AppException(string errorCode, string message, int statusCode, Exception? innerException = null)
        : base(message, innerException)
    {
        ErrorCode  = errorCode;
        StatusCode = statusCode;
    }
}

