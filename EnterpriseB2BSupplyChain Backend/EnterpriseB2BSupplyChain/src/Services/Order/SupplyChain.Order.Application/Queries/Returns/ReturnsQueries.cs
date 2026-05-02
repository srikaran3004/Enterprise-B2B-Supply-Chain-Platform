using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Enums;

namespace SupplyChain.Order.Application.Queries.Returns;

public record ReturnDto(
    Guid ReturnId,
    Guid OrderId,
    string OrderNumber,
    Guid DealerId,
    string? DealerName,
    string Reason,
    string? PhotoUrl,
    string? ThumbUrl,
    string Status,
    string? AdminNotes,
    DateTime RequestedAt,
    DateTime? ResolvedAt
);

public record GetMyReturnsQuery(Guid DealerId, string? Status) : IRequest<List<ReturnDto>>;

public class GetMyReturnsQueryHandler : IRequestHandler<GetMyReturnsQuery, List<ReturnDto>>
{
    private readonly IOrderRepository _repository;

    public GetMyReturnsQueryHandler(IOrderRepository repository) => _repository = repository;

    public async Task<List<ReturnDto>> Handle(GetMyReturnsQuery request, CancellationToken ct)
    {
        var returns = await _repository.GetReturnsByDealerIdAsync(request.DealerId, request.Status, ct);
        return returns.Select(r => new ReturnDto(
            r.ReturnId, r.OrderId, r.Order.OrderNumber, r.DealerId, r.Order.DealerName,
            r.Reason, r.PhotoUrl, r.ThumbUrl, r.Status.ToString(), r.AdminNotes,
            r.RequestedAt, r.ResolvedAt
        )).ToList();
    }
}

public record GetAllReturnsQuery(string? Status) : IRequest<List<ReturnDto>>;

public class GetAllReturnsQueryHandler : IRequestHandler<GetAllReturnsQuery, List<ReturnDto>>
{
    private readonly IOrderRepository _repository;

    public GetAllReturnsQueryHandler(IOrderRepository repository) => _repository = repository;

    public async Task<List<ReturnDto>> Handle(GetAllReturnsQuery request, CancellationToken ct)
    {
        var returns = await _repository.GetAllReturnsAsync(request.Status, ct);
        return returns.Select(r => new ReturnDto(
            r.ReturnId, r.OrderId, r.Order.OrderNumber, r.DealerId, r.Order.DealerName,
            r.Reason, r.PhotoUrl, r.ThumbUrl, r.Status.ToString(), r.AdminNotes,
            r.RequestedAt, r.ResolvedAt
        )).ToList();
    }
}
