using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SupplyChain.Payment.Infrastructure.Persistence;

public class PaymentDbContextFactory : IDesignTimeDbContextFactory<PaymentDbContext>
{
    public PaymentDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PaymentDbContext>();
        optionsBuilder.UseSqlServer("Server=.\\SQLEXPRESS;Database=HUL_PaymentDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;");
        return new PaymentDbContext(optionsBuilder.Options);
    }
}
