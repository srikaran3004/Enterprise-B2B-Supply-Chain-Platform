namespace SupplyChain.SharedInfrastructure.Security;

/// <summary>
/// Shared constants used for service-to-service auth policy and claims.
/// </summary>
public static class InternalAuthDefaults
{
    public const string InternalPolicy = "InternalService";
    public const string InternalRole = "InternalService";
    public const string ClientTypeClaim = "client_type";
    public const string InternalClientType = "internal_service";
}


