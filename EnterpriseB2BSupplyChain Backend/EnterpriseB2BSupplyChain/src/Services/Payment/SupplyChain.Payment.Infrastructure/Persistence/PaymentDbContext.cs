using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.Infrastructure.Persistence;

public class PaymentDbContext : DbContext
{
    public PaymentDbContext(DbContextOptions<PaymentDbContext> options)
        : base(options) { }

    public DbSet<Invoice>             Invoices       => Set<Invoice>();
    public DbSet<InvoiceLine>         InvoiceLines   => Set<InvoiceLine>();
    public DbSet<DealerCreditAccount> CreditAccounts => Set<DealerCreditAccount>();
    public DbSet<PurchaseLimitHistory> PurchaseLimitHistory => Set<PurchaseLimitHistory>();
    public DbSet<PaymentRecord>       PaymentRecords => Set<PaymentRecord>();
    public DbSet<ConsumedMessage>     ConsumedMessages => Set<ConsumedMessage>();
    public DbSet<OutboxMessage>       OutboxMessages   => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PaymentDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
