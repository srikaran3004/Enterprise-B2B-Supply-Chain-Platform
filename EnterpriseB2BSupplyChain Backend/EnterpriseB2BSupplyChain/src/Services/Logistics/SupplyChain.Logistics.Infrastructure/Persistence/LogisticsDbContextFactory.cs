using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SupplyChain.Logistics.Infrastructure.Persistence;

public class LogisticsDbContextFactory : IDesignTimeDbContextFactory<LogisticsDbContext>
{
    public LogisticsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<LogisticsDbContext>();
        optionsBuilder.UseSqlServer("Server=.\\SQLEXPRESS;Database=LogisticsDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;");
        
        return new LogisticsDbContext(optionsBuilder.Options);
    }
}
