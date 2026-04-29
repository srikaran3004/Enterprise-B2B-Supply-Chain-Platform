using SupplyChain.Identity.Domain.Enums;
using SupplyChain.Identity.Domain.Exceptions;
using SupplyChain.Identity.Domain.Events;

namespace SupplyChain.Identity.Domain.Entities;

public class User
{
    public Guid UserId { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string? PhoneNumber { get; private set; }
    public UserRole Role { get; private set; }
    public UserStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? ProfilePictureUrl { get; private set; }

    // Soft delete
    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    // Navigation property
    public DealerProfile? DealerProfile { get; private set; }

    // Domain events collection
    private readonly List<object> _domainEvents = new();
    public IReadOnlyList<object> DomainEvents => _domainEvents.AsReadOnly();

    // EF Core needs this
    private User() { }

    // Factory method — use this instead of constructor directly
    public static User CreateDealer(
        string email,
        string passwordHash,
        string fullName,
        string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new DomainException("INVALID_EMAIL", "Email cannot be empty.");

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("INVALID_PASSWORD", "Password hash cannot be empty.");

        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("INVALID_NAME", "Full name cannot be empty.");

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            FullName = fullName.Trim(),
            PhoneNumber = phoneNumber,
            Role = UserRole.Dealer,
            Status = UserStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        user._domainEvents.Add(new DealerRegisteredEvent(user.UserId, user.Email, user.FullName));
        return user;
    }

    public static User CreateStaff(
        string email,
        string passwordHash,
        string fullName,
        UserRole role,
        string? phoneNumber = null)
    {
        var allowedRoles = new[] { UserRole.SuperAdmin, UserRole.Admin, UserRole.DeliveryAgent };
        if (!allowedRoles.Contains(role))
            throw new DomainException("INVALID_ROLE", "Use CreateDealer for Dealer role users.");

        return new User
        {
            UserId = Guid.NewGuid(),
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            FullName = fullName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber.Trim(),
            Role = role,
            Status = UserStatus.Active,   // Staff are active immediately
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Approve(Guid approvedByAdminId)
    {
        if (Status != UserStatus.Pending)
            throw new DomainException("INVALID_STATUS", "Only Pending users can be approved.");

        Status = UserStatus.Active;
        UpdatedAt = DateTime.UtcNow;

        _domainEvents.Add(new DealerApprovedEvent(UserId, Email, FullName, approvedByAdminId));
    }

    public void Reject(Guid rejectedByAdminId)
    {
        if (Status != UserStatus.Pending)
            throw new DomainException("INVALID_STATUS", "Only Pending users can be rejected.");

        Status = UserStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Suspend()
    {
        if (Status != UserStatus.Active)
            throw new DomainException("INVALID_STATUS", "Only Active users can be suspended.");

        Status = UserStatus.Suspended;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reactivate()
    {
        if (Status != UserStatus.Suspended && Status != UserStatus.Rejected)
            throw new DomainException("INVALID_STATUS", "Only Suspended or Rejected users can be reactivated.");

        Status = UserStatus.Active;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePasswordHash(string newHash)
    {
        PasswordHash = newHash;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateProfilePicture(string url)
    {
        ProfilePictureUrl = url;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearDomainEvents() => _domainEvents.Clear();

    /// <summary>
    /// Soft-delete: marks this user as deleted without physically removing the row.
    /// Suspended status is applied so any non-filtered auth queries block login.
    /// The global EF query filter will exclude the user from all standard lookups.
    /// </summary>
    public void SoftDelete()
    {
        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
        Status    = UserStatus.Suspended; // Belt-and-suspenders: block auth even if filter is bypassed
        UpdatedAt = DateTime.UtcNow;
    }
}
