using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;
using SupplyChain.Identity.Domain.Exceptions;

namespace SupplyChain.Identity.Tests;

public class UserTests
{
    [Test]
    public void CreateStaff_WithAdminRole_SetsActiveStatusAndNormalizesEmail()
    {
        var user = User.CreateStaff("  ADMIN@unidistrib.com  ", "hash", "Admin User", UserRole.Admin);

        Assert.Multiple(() =>
        {
            Assert.That(user.Email, Is.EqualTo("admin@unidistrib.com"));
            Assert.That(user.Role, Is.EqualTo(UserRole.Admin));
            Assert.That(user.Status, Is.EqualTo(UserStatus.Active));
            Assert.That(user.CreatedAt, Is.Not.EqualTo(default(DateTime)));
        });
    }

    [Test]
    public void CreateStaff_WithDealerRole_ThrowsDomainException()
    {
        var ex = Assert.Throws<DomainException>(() =>
            User.CreateStaff("dealer@unidistrib.com", "hash", "Dealer User", UserRole.Dealer));

        Assert.That(ex!.Code, Is.EqualTo("INVALID_ROLE"));
    }
}
