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
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRecordRepository _paymentRecordRepository;

    public PaymentController(
        IMediator mediator,
        ICreditAccountRepository creditRepository,
        IInvoiceRepository invoiceRepository,
        IPaymentRecordRepository paymentRecordRepository)
    {
        _mediator = mediator;
        _creditRepository = creditRepository;
        _invoiceRepository = invoiceRepository;
        _paymentRecordRepository = paymentRecordRepository;
    }

    [HttpGet("dealers/{dealerId:guid}/credit-check")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> CheckCredit(
        Guid dealerId,
        [FromQuery] decimal amount,
        CancellationToken ct)
    {
        if (User.IsInRole("Dealer") && dealerId != GetDealerId())
            return Forbid();

        var result = await _mediator.Send(new CheckCreditQuery(dealerId, amount), ct);
        return Ok(result);
    }

    [HttpGet("internal/dealers/{dealerId:guid}/credit-check")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> CheckCreditInternal(
        Guid dealerId,
        [FromQuery] decimal amount,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new CheckCreditQuery(dealerId, amount), ct);
        return Ok(result);
    }

    [HttpPost("internal/orders/{orderId:guid}/reserve-credit")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> ReserveCreditForOrder(
        Guid orderId,
        [FromBody] InternalCreditAdjustmentRequest request,
        CancellationToken ct)
    {
        if (request.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });

        var existingPayment = await _paymentRecordRepository.GetByOrderIdAsync(orderId, ct);
        if (existingPayment is not null)
            return Ok(new { message = "Credit already reserved for order.", available = (decimal?)null });

        var account = await _creditRepository.GetByDealerIdAsync(request.DealerId, ct);
        if (account is null)
        {
            account = DealerCreditAccount.Create(request.DealerId);
            await _creditRepository.AddAsync(account, ct);
        }

        if (!account.CanAccommodate(request.Amount))
            return BadRequest(new { error = "Insufficient available credit.", available = account.AvailableCredit });

        account.AddOutstanding(request.Amount);

        var paymentRecord = PaymentRecord.Create(
            orderId: orderId,
            dealerId: request.DealerId,
            amount: request.Amount,
            paymentMode: "Credit");

        await _paymentRecordRepository.AddAsync(paymentRecord, ct);
        await _paymentRecordRepository.SaveChangesAsync(ct);

        return Ok(new { message = "Credit reserved.", available = account.AvailableCredit });
    }

    [HttpPost("internal/orders/{orderId:guid}/release-credit")]
    [Authorize(Policy = InternalAuthDefaults.InternalPolicy)]
    public async Task<IActionResult> ReleaseCreditForOrder(
        Guid orderId,
        [FromBody] InternalCreditAdjustmentRequest request,
        CancellationToken ct)
    {
        if (request.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });

        var account = await _creditRepository.GetByDealerIdAsync(request.DealerId, ct);
        if (account is null)
            return Ok(new { message = "No credit account found. Nothing to release." });

        account.ReduceOutstanding(request.Amount);
        await _paymentRecordRepository.SaveChangesAsync(ct);

        return Ok(new { message = "Credit released.", available = account.AvailableCredit });
    }

    [HttpGet("dealers/{dealerId:guid}/credit-account")]
    [Authorize(Roles = "Admin,SuperAdmin,Dealer")]
    public async Task<IActionResult> GetCreditAccount(Guid dealerId, CancellationToken ct)
    {
        if (User.IsInRole("Dealer") && dealerId != GetDealerId())
            return Forbid();

        var account = await _creditRepository.GetByDealerIdAsync(dealerId, ct);
        var invoices = await _invoiceRepository.GetByDealerIdAsync(dealerId, ct);
        var payments = await _paymentRecordRepository.GetByOrderIdsAsync(invoices.Select(i => i.OrderId), ct);

        var paidOrderIds = payments
            .Where(p => string.Equals(p.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            .Select(p => p.OrderId)
            .ToHashSet();

        var liveOutstanding = invoices
            .Where(i => !paidOrderIds.Contains(i.OrderId))
            .Sum(i => i.GrandTotal);

        if (account is null)
        {
            var defaultLimit = 500_000m;
            var available = Math.Max(0, defaultLimit - liveOutstanding);
            var utilizationDefault = defaultLimit > 0
                ? (int)Math.Round(liveOutstanding / defaultLimit * 100)
                : 0;

            return Ok(new CreditAccountDto(
                AccountId: Guid.Empty,
                DealerId: dealerId,
                CreditLimit: defaultLimit,
                Outstanding: liveOutstanding,
                Available: available,
                Utilization: utilizationDefault,
                LastUpdatedAt: null
            ));
        }

        var effectiveOutstanding = Math.Max(account.CurrentOutstanding, liveOutstanding);

        var utilization = account.CreditLimit > 0
            ? (int)Math.Round(effectiveOutstanding / account.CreditLimit * 100)
            : 0;

        return Ok(new CreditAccountDto(
            AccountId: account.AccountId,
            DealerId: account.DealerId,
            CreditLimit: account.CreditLimit,
            Outstanding: effectiveOutstanding,
            Available: Math.Max(0, account.CreditLimit - effectiveOutstanding),
            Utilization: utilization,
            LastUpdatedAt: account.LastUpdatedAt
        ));
    }

    [HttpPost("dealers/{dealerId:guid}/credit-account")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateCreditAccount(Guid dealerId, CancellationToken ct)
    {
        var accountId = await _mediator.Send(new CreateCreditAccountCommand(dealerId), ct);
        return Ok(new { accountId });
    }

    [HttpPut("dealers/{dealerId:guid}/credit-limit")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateCreditLimit(
        Guid dealerId,
        [FromBody] UpdateLimitRequest request,
        CancellationToken ct)
    {
        await _mediator.Send(new UpdateCreditLimitCommand(dealerId, request.NewLimit), ct);
        return Ok(new { Message = "Credit limit updated." });
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
}

public record UpdateLimitRequest(decimal NewLimit);
public record InternalCreditAdjustmentRequest(Guid DealerId, decimal Amount);

