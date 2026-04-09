using Microsoft.EntityFrameworkCore;
using SupplyChain.Order.Domain.Entities;

namespace SupplyChain.Order.Infrastructure.Persistence;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options)
        : base(options) { }

    public DbSet<Domain.Entities.Order> Orders         => Set<Domain.Entities.Order>();
    public DbSet<OrderLine>             OrderLines      => Set<OrderLine>();
    public DbSet<OrderStatusHistory>    StatusHistories => Set<OrderStatusHistory>();
    public DbSet<ReturnRequest>         ReturnRequests  => Set<ReturnRequest>();
    public DbSet<OutboxMessage>         OutboxMessages  => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OrderDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
