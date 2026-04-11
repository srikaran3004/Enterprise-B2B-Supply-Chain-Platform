using Microsoft.EntityFrameworkCore;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Infrastructure.Persistence.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly OrderDbContext _context;

    public OrderRepository(OrderDbContext context) => _context = context;

    public async Task<Domain.Entities.Order?> GetByIdAsync(Guid orderId, CancellationToken ct = default)
        => await _context.Orders
            .Include(o => o.Lines)
            .Include(o => o.StatusHistory)
            .Include(o => o.ReturnRequest)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.OrderId == orderId, ct);

    public async Task<Domain.Entities.Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default)
        => await _context.Orders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

    public async Task<List<Domain.Entities.Order>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default)
        => await _context.Orders
            .AsNoTracking()
            .Include(o => o.Lines)
            .Where(o => o.DealerId == dealerId)
            .OrderByDescending(o => o.PlacedAt)
            .ToListAsync(ct);

    public async Task<List<Domain.Entities.Order>> GetAllAsync(OrderStatus? statusFilter = null, CancellationToken ct = default)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Include(o => o.Lines)
            .AsQueryable();

        if (statusFilter.HasValue)
            query = query.Where(o => o.Status == statusFilter.Value);

        return await query.OrderByDescending(o => o.PlacedAt).ToListAsync(ct);
    }

    public async Task<(List<Domain.Entities.Order> Orders, int TotalCount)> GetByDealerPagedAsync(
        Guid dealerId,
        OrderStatus? statusFilter,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Max(1, pageSize);

        var query = _context.Orders
            .AsNoTracking()
            .Where(o => o.DealerId == dealerId)
            .AsQueryable();

        if (statusFilter.HasValue)
            query = query.Where(o => o.Status == statusFilter.Value);

        var totalCount = await query.CountAsync(ct);

        var orders = await query
            .OrderByDescending(o => o.PlacedAt)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Include(o => o.Lines)
            .AsSplitQuery()
            .ToListAsync(ct);

        return (orders, totalCount);
    }

    public async Task<(List<Domain.Entities.Order> Orders, int TotalCount)> GetAllPagedAsync(
        OrderStatus? statusFilter,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Max(1, pageSize);

        var query = _context.Orders
            .AsNoTracking()
            .AsQueryable();

        if (statusFilter.HasValue)
            query = query.Where(o => o.Status == statusFilter.Value);

        var totalCount = await query.CountAsync(ct);

        var orders = await query
            .OrderByDescending(o => o.PlacedAt)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Include(o => o.Lines)
            .AsSplitQuery()
            .ToListAsync(ct);

        return (orders, totalCount);
    }

    public async Task<bool> TryApproveOrderAsync(Guid orderId, Guid adminId, string fromStatus, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE Orders
            SET Status = {OrderStatus.Processing.ToString()}, UpdatedAt = {now}
            WHERE OrderId = {orderId}
              AND Status IN ({OrderStatus.Placed.ToString()}, {OrderStatus.OnHold.ToString()})", ct);

        if (affected == 0)
            return false;

        var history = OrderStatusHistory.Create(
            orderId: orderId,
            fromStatus: fromStatus,
            toStatus: OrderStatus.Processing.ToString(),
            changedByUserId: adminId,
            notes: "Approved by Admin");

        await _context.StatusHistories.AddAsync(history, ct);
        return true;
    }

    public async Task<bool> TryTransitionStatusAsync(
        Guid orderId,
        Guid actorId,
        OrderStatus expectedFrom,
        OrderStatus toStatus,
        string notes,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE Orders
            SET Status = {toStatus.ToString()}, UpdatedAt = {now}
            WHERE OrderId = {orderId}
              AND Status = {expectedFrom.ToString()}", ct);

        if (affected == 0)
            return false;

        var history = OrderStatusHistory.Create(
            orderId: orderId,
            fromStatus: expectedFrom.ToString(),
            toStatus: toStatus.ToString(),
            changedByUserId: actorId,
            notes: notes);

        await _context.StatusHistories.AddAsync(history, ct);
        return true;
    }

    public async Task<bool> TryCancelOrderAsync(
        Guid orderId,
        Guid actorId,
        string fromStatus,
        string reason,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE Orders
            SET Status = {OrderStatus.Cancelled.ToString()},
                CancellationReason = {reason},
                UpdatedAt = {now}
            WHERE OrderId = {orderId}
              AND Status IN ({OrderStatus.Placed.ToString()}, {OrderStatus.OnHold.ToString()}, {OrderStatus.Processing.ToString()})", ct);

        if (affected == 0)
            return false;

        var history = OrderStatusHistory.Create(
            orderId: orderId,
            fromStatus: fromStatus,
            toStatus: OrderStatus.Cancelled.ToString(),
            changedByUserId: actorId,
            notes: reason);

        await _context.StatusHistories.AddAsync(history, ct);
        return true;
    }

    public async Task<string> GenerateOrderNumberAsync(CancellationToken ct = default)
    {
        // ORD-2025-00001 format
        var year  = DateTime.UtcNow.Year;
        var count = await _context.Orders.CountAsync(ct);
        return $"ORD-{year}-{(count + 1):D5}";
    }

    public async Task AddAsync(Domain.Entities.Order order, CancellationToken ct = default)
        => await _context.Orders.AddAsync(order, ct);

    public async Task AddReturnAsync(ReturnRequest request, CancellationToken ct = default)
    {
        await _context.ReturnRequests.AddAsync(request, ct);
    }

    public async Task<List<ReturnRequest>> GetReturnsByDealerIdAsync(Guid dealerId, string? status, CancellationToken ct = default)
    {
        var q = _context.ReturnRequests.Include(r => r.Order).Where(r => r.DealerId == dealerId);
        
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReturnStatus>(status, true, out var s))
            q = q.Where(r => r.Status == s);

        return await q.OrderByDescending(r => r.RequestedAt).ToListAsync(ct);
    }

    public async Task<List<ReturnRequest>> GetAllReturnsAsync(string? status, CancellationToken ct = default)
    {
        var q = _context.ReturnRequests.Include(r => r.Order).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReturnStatus>(status, true, out var s))
            q = q.Where(r => r.Status == s);

        return await q.OrderByDescending(r => r.RequestedAt).ToListAsync(ct);
    }

    public async Task<ReturnRequest?> GetReturnByIdAsync(Guid returnId, CancellationToken ct = default)
    {
        return await _context.ReturnRequests.Include(r => r.Order).FirstOrDefaultAsync(r => r.ReturnId == returnId, ct);
    }  
    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            _context.ChangeTracker.Clear();
            throw;
        }
    }
}
