using MediatR;
using SupplyChain.Notification.Application.Abstractions;

namespace SupplyChain.Notification.Application.Commands;

public record MarkNotificationReadCommand(Guid NotificationId, Guid DealerId) : IRequest;

public class MarkNotificationReadCommandHandler : IRequestHandler<MarkNotificationReadCommand>
{
    private readonly INotificationInboxRepository _repository;

    public MarkNotificationReadCommandHandler(INotificationInboxRepository repository) => _repository = repository;

    public async Task Handle(MarkNotificationReadCommand request, CancellationToken ct)
    {
        await _repository.MarkAsReadAsync(request.NotificationId, request.DealerId, ct);
        await _repository.SaveChangesAsync(ct);
    }
}

public record MarkAllNotificationsReadCommand(Guid DealerId) : IRequest;

public class MarkAllNotificationsReadCommandHandler : IRequestHandler<MarkAllNotificationsReadCommand>
{
    private readonly INotificationInboxRepository _repository;

    public MarkAllNotificationsReadCommandHandler(INotificationInboxRepository repository) => _repository = repository;

    public async Task Handle(MarkAllNotificationsReadCommand request, CancellationToken ct)
    {
        await _repository.MarkAllAsReadAsync(request.DealerId, ct);
        await _repository.SaveChangesAsync(ct);
    }
}
