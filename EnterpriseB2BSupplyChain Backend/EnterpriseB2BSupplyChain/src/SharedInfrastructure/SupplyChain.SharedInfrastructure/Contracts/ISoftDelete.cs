namespace SupplyChain.SharedInfrastructure.Contracts;

/// <summary>
/// Marks a domain entity as soft-deletable.
/// Entities implementing this interface are never physically removed from the database.
/// Instead, <see cref="IsDeleted"/> is set to <c>true</c> and a global EF Core query filter
/// automatically excludes them from all standard queries.
/// </summary>
public interface ISoftDelete
{
    /// <summary>Whether this record has been soft-deleted.</summary>
    bool IsDeleted { get; }

    /// <summary>UTC timestamp of when the record was soft-deleted, or null if still active.</summary>
    DateTime? DeletedAt { get; }
}
