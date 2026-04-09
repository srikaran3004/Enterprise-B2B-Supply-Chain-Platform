using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SupplyChain.Notification.Infrastructure.Persistence;

public class NotificationDbContextFactory : IDesignTimeDbContextFactory<NotificationDbContext>
{
    public NotificationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<NotificationDbContext>();
        optionsBuilder.UseSqlServer("Server=.\\SQLEXPRESS;Database=NotificationDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;");
        return new NotificationDbContext(optionsBuilder.Options);
    }
}
