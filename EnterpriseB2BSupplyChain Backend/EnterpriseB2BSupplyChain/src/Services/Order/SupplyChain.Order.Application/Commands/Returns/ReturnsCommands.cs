using MediatR;
using SupplyChain.Order.Application.Abstractions;

namespace SupplyChain.Order.Application.Commands.Returns;

public record ApproveReturnCommand(Guid ReturnId, Guid AdminId, string? AdminNotes) : IRequest;

public class ApproveReturnCommandHandler : IRequestHandler<ApproveReturnCommand>
{
    private readonly IOrderRepository _repository;

    public ApproveReturnCommandHandler(IOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(ApproveReturnCommand request, CancellationToken ct)
    {
        var ret = await _repository.GetReturnByIdAsync(request.ReturnId, ct)
            ?? throw new KeyNotFoundException("Return request not found.");

        ret.Approve(request.AdminNotes);
        await _repository.SaveChangesAsync(ct);
    }
}

public record RejectReturnCommand(Guid ReturnId, Guid AdminId, string? AdminNotes) : IRequest;

public class RejectReturnCommandHandler : IRequestHandler<RejectReturnCommand>
{
    private readonly IOrderRepository _repository;

    public RejectReturnCommandHandler(IOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(RejectReturnCommand request, CancellationToken ct)
    {
        var ret = await _repository.GetReturnByIdAsync(request.ReturnId, ct)
            ?? throw new KeyNotFoundException("Return request not found.");

        ret.Reject(request.AdminNotes);
        await _repository.SaveChangesAsync(ct);
    }
}
