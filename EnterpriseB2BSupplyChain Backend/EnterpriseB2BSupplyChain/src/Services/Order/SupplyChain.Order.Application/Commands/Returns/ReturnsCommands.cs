using System.Text.Json;
using MediatR;
using SupplyChain.Order.Application.Abstractions;
using SupplyChain.Order.Domain.Entities;
using SupplyChain.Order.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace SupplyChain.Order.Application.Commands.Returns;

public record ApproveReturnCommand(Guid ReturnId, Guid AdminId, string? AdminNotes) : IRequest;

public class ApproveReturnCommandHandler : IRequestHandler<ApproveReturnCommand>
{
    private readonly IOrderRepository _repository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IInventoryServiceClient _inventoryServiceClient;
    private readonly IPaymentServiceClient _paymentServiceClient;
    private readonly IIdentityServiceClient _identityServiceClient;
    private readonly ILogger<ApproveReturnCommandHandler> _logger;

    public ApproveReturnCommandHandler(
        IOrderRepository repository,
        IOutboxRepository outboxRepository,
        IInventoryServiceClient inventoryServiceClient,
        IPaymentServiceClient paymentServiceClient,
        IIdentityServiceClient identityServiceClient,
        ILogger<ApproveReturnCommandHandler> logger)
    {
        _repository = repository;
        _outboxRepository = outboxRepository;
        _inventoryServiceClient = inventoryServiceClient;
        _paymentServiceClient = paymentServiceClient;
        _identityServiceClient = identityServiceClient;
        _logger = logger;
    }

    public async Task Handle(ApproveReturnCommand request, CancellationToken ct)
    {
        var ret = await _repository.GetReturnByIdAsync(request.ReturnId, ct)
            ?? throw new KeyNotFoundException("Return request not found.");

        if (ret.Status == ReturnStatus.Rejected)
            throw new InvalidOperationException("Rejected return requests cannot be approved.");

        if (ret.Status == ReturnStatus.Approved)
            return;

        ret.Approve(request.AdminNotes);
        ret.Order.ApproveReturn(request.AdminId, request.AdminNotes);

        var order = ret.Order;
        var restoreSucceeded = await _inventoryServiceClient.RestoreOrderInventoryAsync(
            order.DealerId,
            order.Lines.Select(l => new InventoryOrderLine(l.ProductId, l.Quantity)).ToList(),
            ct);

        if (!restoreSucceeded)
        {
            _logger.LogWarning(
                "Return approved but inventory restore failed for ReturnId={ReturnId}, OrderId={OrderId}",
                ret.ReturnId,
                order.OrderId);
        }

        var releaseSucceeded = await _paymentServiceClient.ReleaseCreditAsync(
            order.OrderId,
            order.DealerId,
            order.TotalAmount,
            ct);

        if (!releaseSucceeded)
        {
            _logger.LogWarning(
                "Return approved but purchase-limit release failed for ReturnId={ReturnId}, OrderId={OrderId}",
                ret.ReturnId,
                order.OrderId);
        }

        var dealerContact = await _identityServiceClient.GetDealerContactAsync(order.DealerId, ct);
        var dealerEmail = string.IsNullOrWhiteSpace(order.DealerEmail)
            ? dealerContact?.Email
            : order.DealerEmail;
        var dealerName = string.IsNullOrWhiteSpace(order.DealerName)
            ? dealerContact?.FullName
            : order.DealerName;

        var outbox = OutboxMessage.Create("ReturnApproved", JsonSerializer.Serialize(new
        {
            ret.ReturnId,
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            dealerEmail,
            dealerName,
            RefundAmount = order.TotalAmount,
            RefundMode = string.IsNullOrWhiteSpace(order.PaymentMode) ? "Credit" : order.PaymentMode,
            AdminId = request.AdminId,
            AdminNotes = request.AdminNotes
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _repository.SaveChangesAsync(ct);
    }
}

public record RejectReturnCommand(Guid ReturnId, Guid AdminId, string? AdminNotes) : IRequest;

public class RejectReturnCommandHandler : IRequestHandler<RejectReturnCommand>
{
    private readonly IOrderRepository _repository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IIdentityServiceClient _identityServiceClient;

    public RejectReturnCommandHandler(
        IOrderRepository repository,
        IOutboxRepository outboxRepository,
        IIdentityServiceClient identityServiceClient)
    {
        _repository = repository;
        _outboxRepository = outboxRepository;
        _identityServiceClient = identityServiceClient;
    }

    public async Task Handle(RejectReturnCommand request, CancellationToken ct)
    {
        var ret = await _repository.GetReturnByIdAsync(request.ReturnId, ct)
            ?? throw new KeyNotFoundException("Return request not found.");

        if (ret.Status == ReturnStatus.Approved)
            throw new InvalidOperationException("Approved return requests cannot be rejected.");

        if (ret.Status == ReturnStatus.Rejected)
            return;

        ret.Reject(request.AdminNotes);
        ret.Order.RejectReturn(request.AdminId, request.AdminNotes);

        var order = ret.Order;
        var dealerContact = await _identityServiceClient.GetDealerContactAsync(order.DealerId, ct);
        var dealerEmail = string.IsNullOrWhiteSpace(order.DealerEmail)
            ? dealerContact?.Email
            : order.DealerEmail;
        var dealerName = string.IsNullOrWhiteSpace(order.DealerName)
            ? dealerContact?.FullName
            : order.DealerName;

        var outbox = OutboxMessage.Create("ReturnRejected", JsonSerializer.Serialize(new
        {
            ret.ReturnId,
            order.OrderId,
            order.OrderNumber,
            order.DealerId,
            dealerEmail,
            dealerName,
            AdminId = request.AdminId,
            AdminNotes = request.AdminNotes
        }));

        await _outboxRepository.AddAsync(outbox, ct);
        await _repository.SaveChangesAsync(ct);
    }
}
