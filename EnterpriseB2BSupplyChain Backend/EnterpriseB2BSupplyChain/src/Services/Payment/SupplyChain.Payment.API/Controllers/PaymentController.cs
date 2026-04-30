using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Payment.Application.Abstractions;
using SupplyChain.Payment.Application.Commands.CreateCreditAccount;
using SupplyChain.Payment.Application.Commands.GenerateInvoice;
using SupplyChain.Payment.Application.Commands.UpdateCreditLimit;
using SupplyChain.Payment.Application.DTOs;
using SupplyChain.Payment.Application.Queries.CheckCredit;
using SupplyChain.Payment.Application.Queries.ExportSales;
using SupplyChain.Payment.Application.Queries.GetInvoiceById;
using SupplyChain.Payment.Application.Queries.GetInvoices;
using SupplyChain.Payment.Domain.Entities;

namespace SupplyChain.Payment.API.Controllers;

[ApiController]
[Route("api/payment")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICreditAccountRepository _creditRepository;
    private readonly IPurchaseLimitHistoryRepository _purchaseLimitHistoryRepository;
    private readonly IPaymentRecordRepository _paymentRecordRepository;

    public PaymentController(
        IMediator mediator,
        ICreditAccountRepository creditRepository,
        IPurchaseLimitHistoryRepository purchaseLimitHistoryRepository,
        IPaymentRecordRepository paymentRecordRepository)
    {
        _mediator = mediator;
        _creditRepository = creditRepository;
        _purchaseLimitHistoryRepository = purchaseLimitHistoryRepository;
        _paymentRecordRepository = paymentRecordRepository;
    }

    [HttpGet("dealers/{dealerId:guid}/purchase-limit-check")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> CheckPurchaseLimit(
        Guid dealerId,
        [FromQuery] decimal amount,
        CancellationToken ct)
    {
        if (User.IsInRole("Dealer") && dealerId != GetDealerId())
            return Forbid();

        var result = await _mediator.Send(new CheckCreditQuery(dealerId, amount), ct);
        return Ok(result);
    }

    [HttpGet("internal/dealers/{dealerId:guid}/purchase-limit-check")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> CheckPurchaseLimitInternal(
        Guid dealerId,
        [FromQuery] decimal amount,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new CheckCreditQuery(dealerId, amount), ct);
        return Ok(result);
    }

    [HttpPost("internal/orders/{orderId:guid}/reserve-purchase-limit")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> ReservePurchaseLimitForOrder(
        Guid orderId,
        [FromBody] InternalCreditAdjustmentRequest request,
        CancellationToken ct)
    {
        if (request.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });

        var existingPayment = await _paymentRecordRepository.GetByOrderIdAsync(orderId, ct);
        if (existingPayment is not null)
            return Ok(new { message = "Purchase limit already reserved for this order.", available = (decimal?)null });

        var account = await _creditRepository.GetByDealerIdAsync(request.DealerId, ct);
        if (account is null)
        {
            account = DealerCreditAccount.Create(request.DealerId);
            await _creditRepository.AddAsync(account, ct);
        }

        account.EnsureMonthlyReset(DateTime.UtcNow);

        if (!account.CanAccommodate(request.Amount))
            return BadRequest(new { error = "Insufficient remaining purchase limit.", availableLimit = account.AvailableCredit });

        account.ReserveAmount(request.Amount);

        var paymentRecord = PaymentRecord.Create(
            orderId: orderId,
            dealerId: request.DealerId,
            amount: request.Amount,
            paymentMode: "Credit");

        await _paymentRecordRepository.AddAsync(paymentRecord, ct);
        await _paymentRecordRepository.SaveChangesAsync(ct);

        return Ok(new { message = "Purchase limit reserved.", availableLimit = account.AvailableCredit });
    }

    [HttpPost("internal/orders/{orderId:guid}/release-purchase-limit")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> ReleasePurchaseLimitForOrder(
        Guid orderId,
        [FromBody] InternalCreditAdjustmentRequest request,
        CancellationToken ct)
    {
        if (request.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });

        var account = await _creditRepository.GetByDealerIdAsync(request.DealerId, ct);
        if (account is null)
            return Ok(new { message = "No purchase account found. Nothing to release." });

        if (account.ReservedAmount >= request.Amount)
        {
            account.ReleaseReserve(request.Amount);
        }
        else
        {
            account.ReduceOutstanding(request.Amount);
        }
        await _paymentRecordRepository.SaveChangesAsync(ct);

        return Ok(new { message = "Purchase limit released.", availableLimit = account.AvailableCredit });
    }

    [HttpGet("dealers/{dealerId:guid}/purchase-limit-account")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> GetPurchaseLimitAccount(Guid dealerId, CancellationToken ct)
    {
        if (User.IsInRole("Dealer") && dealerId != GetDealerId())
            return Forbid();

        var account = await _creditRepository.GetByDealerIdAsync(dealerId, ct);

        if (account is null)
        {
            var defaultLimit = 500_000m;
            return Ok(new CreditAccountDto(
                AccountId: Guid.Empty,
                DealerId: dealerId,
                PurchaseLimit: defaultLimit,
                UtilizedAmount: 0,
                AvailableLimit: defaultLimit,
                UtilizationPercent: 0,
                LastUpdatedAt: null
            ));
        }

        if (account.EnsureMonthlyReset(DateTime.UtcNow))
            await _creditRepository.SaveChangesAsync(ct);

        var utilization = account.CreditLimit > 0
            ? (int)Math.Round(account.CurrentOutstanding / account.CreditLimit * 100)
            : 0;

        return Ok(new CreditAccountDto(
            AccountId: account.AccountId,
            DealerId: account.DealerId,
            PurchaseLimit: account.CreditLimit,
            UtilizedAmount: account.CurrentOutstanding,
            AvailableLimit: Math.Max(0, account.CreditLimit - account.CurrentOutstanding),
            UtilizationPercent: utilization,
            LastUpdatedAt: account.LastUpdatedAt
        ));
    }

    [HttpPost("dealers/{dealerId:guid}/purchase-limit-account")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreatePurchaseLimitAccount(Guid dealerId, CancellationToken ct)
    {
        var existing = await _creditRepository.GetByDealerIdAsync(dealerId, ct);
        if (existing is not null)
            return Ok(new { accountId = existing.AccountId });

        var accountId = await _mediator.Send(new CreateCreditAccountCommand(dealerId), ct);

        var now = DateTime.UtcNow;
        await _purchaseLimitHistoryRepository.AddAsync(
            PurchaseLimitHistory.Create(
                dealerId,
                previousLimit: 0,
                newLimit: 500_000m,
                changedAtUtc: now,
                changedByUserId: TryGetCurrentUserId(),
                changedByRole: GetHighestRole(),
                reason: "Initial monthly purchase limit account created"),
            ct);
        await _creditRepository.SaveChangesAsync(ct);

        return Ok(new { accountId });
    }

    [HttpPut("dealers/{dealerId:guid}/purchase-limit")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdatePurchaseLimit(
        Guid dealerId,
        [FromBody] UpdateLimitRequest request,
        CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(dealerId, ct);
        var previousLimit = account?.CreditLimit ?? 0;

        await _mediator.Send(new UpdateCreditLimitCommand(dealerId, request.NewLimit), ct);

        var now = DateTime.UtcNow;
        await _purchaseLimitHistoryRepository.AddAsync(
            PurchaseLimitHistory.Create(
                dealerId,
                previousLimit,
                request.NewLimit,
                now,
                TryGetCurrentUserId(),
                GetHighestRole(),
                request.Reason),
            ct);
        await _creditRepository.SaveChangesAsync(ct);

        return Ok(new { Message = "Monthly purchase limit updated." });
    }

    [HttpGet("dealers/{dealerId:guid}/purchase-limit-history")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> GetPurchaseLimitHistoryByDealer(
        Guid dealerId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        if (User.IsInRole("Dealer") && dealerId != GetDealerId())
            return Forbid();

        var rows = await _purchaseLimitHistoryRepository.GetByDealerIdAsync(dealerId, from, to, ct);
        var result = rows.Select(x => new PurchaseLimitHistoryDto(
            x.HistoryId,
            x.DealerId,
            x.PreviousLimit,
            x.NewLimit,
            x.ChangedAt,
            x.ChangedByUserId,
            x.ChangedByRole,
            x.Reason
        ));

        return Ok(result);
    }

    [HttpPost("invoices/generate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GenerateInvoice(
        [FromBody] GenerateInvoiceCommand command,
        CancellationToken ct)
    {
        var invoiceId = await _mediator.Send(command, ct);
        return Ok(new { invoiceId });
    }

    [HttpGet("invoices")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> GetInvoices(CancellationToken ct)
    {
        Guid? dealerId = User.IsInRole("Dealer") ? GetDealerId() : null;

        var invoices = await _mediator.Send(new GetInvoicesQuery(dealerId), ct);
        return Ok(invoices);
    }

    [HttpGet("invoices/{invoiceId:guid}")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> GetInvoice(Guid invoiceId, CancellationToken ct)
    {
        var invoice = await _mediator.Send(new GetInvoiceByIdQuery(invoiceId), ct);

        if (User.IsInRole("Dealer") && invoice.DealerId != GetDealerId())
            return Forbid();

        return Ok(invoice);
    }

    [HttpGet("invoices/{invoiceId:guid}/download")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> DownloadInvoice(Guid invoiceId, CancellationToken ct)
    {
        var invoice = await _mediator.Send(new GetInvoiceByIdQuery(invoiceId), ct);

        if (User.IsInRole("Dealer") && invoice.DealerId != GetDealerId())
            return Forbid();

        if (string.IsNullOrWhiteSpace(invoice.PdfStoragePath) || !System.IO.File.Exists(invoice.PdfStoragePath))
            return NotFound(new { error = "PDF not yet generated for this invoice." });

        var bytes = await System.IO.File.ReadAllBytesAsync(invoice.PdfStoragePath, ct);
        return File(bytes, "application/pdf", $"{invoice.InvoiceNumber}.pdf");
    }

    [HttpGet("invoices/order/{orderId:guid}")]
    [Authorize(Roles = "Dealer,Admin,SuperAdmin")]
    public async Task<IActionResult> GetInvoiceByOrder(Guid orderId, CancellationToken ct)
    {
        Guid? dealerId = User.IsInRole("Dealer") ? GetDealerId() : null;

        var invoices = await _mediator.Send(new GetInvoicesQuery(dealerId), ct);
        var invoice = invoices.FirstOrDefault(i => i.OrderId == orderId);
        if (invoice == null) return NotFound("Invoice for this order not found.");
        return Ok(invoice);
    }

    [HttpGet("invoices/dealer/{dealerId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetInvoicesByDealerId(Guid dealerId, CancellationToken ct)
    {
        var invoices = await _mediator.Send(new GetInvoicesQuery(dealerId), ct);
        return Ok(invoices);
    }

    /// <summary>
    /// Export all invoices/sales data as an Excel (.xlsx) file.
    /// </summary>
    [HttpGet("admin/sales/export")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ExportSales(CancellationToken ct)
    {
        var result = await _mediator.Send(new ExportSalesQuery(), ct);
        return File(result.FileBytes, result.ContentType, result.FileName);
    }

    private Guid GetDealerId()
    {
        var claim = User.FindFirst("dealerId")?.Value;
        if (Guid.TryParse(claim, out var id))
            return id;

        throw new UnauthorizedAccessException("Dealer token does not contain a valid dealerId claim.");
    }

    private Guid? TryGetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value
            ?? User.FindFirst("userId")?.Value
            ?? User.FindFirst("nameid")?.Value;

        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private string GetHighestRole()
    {
        if (User.IsInRole("SuperAdmin")) return "SuperAdmin";
        if (User.IsInRole("Admin")) return "Admin";
        if (User.IsInRole("Dealer")) return "Dealer";
        return "System";
    }
}

public record UpdateLimitRequest(decimal NewLimit, string? Reason = null);
public record InternalCreditAdjustmentRequest(Guid DealerId, decimal Amount);

