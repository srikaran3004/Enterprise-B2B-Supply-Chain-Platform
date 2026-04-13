namespace SupplyChain.SharedInfrastructure.Exceptions;

/// <summary>HTTP 400 with optional field-level validation details.</summary>
public sealed class ValidationAppException : AppException
{
    public IReadOnlyDictionary<string, string[]> FieldErrors { get; }

    public ValidationAppException(
        IReadOnlyDictionary<string, string[]> fieldErrors,
        string message = "One or more validation errors occurred.")
        : base("VALIDATION_FAILED", message, StatusCodes.BadRequest)
    {
        FieldErrors = fieldErrors;
    }

    public ValidationAppException(string field, string error)
        : this(new Dictionary<string, string[]> { [field] = new[] { error } })
    {
    }
}

/// <summary>HTTP 404 resource not found.</summary>
public sealed class NotFoundAppException : AppException
{
    public NotFoundAppException(string message = "The requested resource was not found.")
        : base("NOT_FOUND", message, StatusCodes.NotFound) { }

    public NotFoundAppException(string resource, object key)
        : base("NOT_FOUND", $"{resource} with key '{key}' was not found.", StatusCodes.NotFound) { }
}

/// <summary>HTTP 401 unauthenticated caller.</summary>
public sealed class UnauthorizedAppException : AppException
{
    public UnauthorizedAppException(string message = "You are not authenticated.")
        : base("UNAUTHORIZED", message, StatusCodes.Unauthorized) { }
}

/// <summary>HTTP 403 authenticated but not authorized.</summary>
public sealed class ForbiddenAppException : AppException
{
    public ForbiddenAppException(string message = "You do not have permission to perform this action.")
        : base("FORBIDDEN", message, StatusCodes.Forbidden) { }
}

/// <summary>HTTP 409 state conflict (duplicate/concurrency/business conflict).</summary>
public sealed class ConflictAppException : AppException
{
    public ConflictAppException(string message)
        : base("CONFLICT", message, StatusCodes.Conflict) { }

    public ConflictAppException(string errorCode, string message)
        : base(errorCode, message, StatusCodes.Conflict) { }
}

internal static class StatusCodes
{
    public const int BadRequest = 400;
    public const int Unauthorized = 401;
    public const int Forbidden = 403;
    public const int NotFound = 404;
    public const int Conflict = 409;
}


