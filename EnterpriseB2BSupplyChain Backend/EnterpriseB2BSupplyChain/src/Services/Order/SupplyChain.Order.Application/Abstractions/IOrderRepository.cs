using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Application.Abstractions;

public interface IOrderRepository
{
    Task<Domain.Entities.Order?> GetByIdAsync(Guid orderId, CancellationToken ct = default);
    Task<Domain.Entities.Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default);
    Task<List<Domain.Entities.Order>> GetByDealerIdAsync(Guid dealerId, CancellationToken ct = default);
    Task<List<Domain.Entities.Order>> GetAllAsync(OrderStatus? statusFilter = null, CancellationToken ct = default);
    Task<(List<Domain.Entities.Order> Orders, int TotalCount)> GetByDealerPagedAsync(
        Guid dealerId,
        OrderStatus? statusFilter,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task<(List<Domain.Entities.Order> Orders, int TotalCount)> GetAllPagedAsync(
        OrderStatus? statusFilter,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task<bool> TryConfirmPaymentAsync(Guid orderId, CancellationToken ct = default);
    Task<bool> TryMarkPaymentFailedAsync(Guid orderId, string reason, CancellationToken ct = default);
    Task<bool> TryApproveOrderAsync(Guid orderId, Guid adminId, string fromStatus, CancellationToken ct = default);
    Task<bool> TryTransitionStatusAsync(
        Guid orderId,
        Guid actorId,
        OrderStatus expectedFrom,
        OrderStatus toStatus,
        string notes,
        CancellationToken ct = default);
    Task<bool> TryCancelOrderAsync(
        Guid orderId,
        Guid actorId,
        string fromStatus,
        string reason,
        CancellationToken ct = default);
    Task<string> GenerateOrderNumberAsync(CancellationToken ct = default);
    Task AddReturnAsync(ReturnRequest request, CancellationToken ct = default);
    Task<List<ReturnRequest>> GetReturnsByDealerIdAsync(Guid dealerId, string? status, CancellationToken ct = default);
    Task<List<ReturnRequest>> GetAllReturnsAsync(string? status, CancellationToken ct = default);
    Task<ReturnRequest?> GetReturnByIdAsync(Guid returnId, CancellationToken ct = default);
    Task AddAsync(Domain.Entities.Order order, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
