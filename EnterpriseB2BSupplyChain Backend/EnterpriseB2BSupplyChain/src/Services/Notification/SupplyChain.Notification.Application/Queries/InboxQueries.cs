using MediatR;
using SupplyChain.Notification.Application.Abstractions;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Application.Queries;

public record NotificationDto(
    Guid NotificationId,
    string Title,
    string Message,
    string Type,
    bool IsRead,
    DateTime CreatedAt
);

public record GetMyInboxQuery(Guid DealerId) : IRequest<List<NotificationDto>>;

public class GetMyInboxQueryHandler : IRequestHandler<GetMyInboxQuery, List<NotificationDto>>
{
    private readonly INotificationInboxRepository _repository;

    public GetMyInboxQueryHandler(INotificationInboxRepository repository) => _repository = repository;

    public async Task<List<NotificationDto>> Handle(GetMyInboxQuery request, CancellationToken ct)
    {
        var inbox = await _repository.GetInboxAsync(request.DealerId, ct);
        return inbox.Select(n => new NotificationDto(
            n.NotificationId, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt
        )).ToList();
    }
}

public record GetUnreadCountQuery(Guid DealerId) : IRequest<int>;

public class GetUnreadCountQueryHandler : IRequestHandler<GetUnreadCountQuery, int>
{
    private readonly INotificationInboxRepository _repository;

    public GetUnreadCountQueryHandler(INotificationInboxRepository repository) => _repository = repository;

    public async Task<int> Handle(GetUnreadCountQuery request, CancellationToken ct)
    {
        return await _repository.GetUnreadCountAsync(request.DealerId, ct);
    }
}
