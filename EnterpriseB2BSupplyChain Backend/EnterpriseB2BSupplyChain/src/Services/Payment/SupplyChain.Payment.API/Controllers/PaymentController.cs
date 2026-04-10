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

namespace SupplyChain.Payment.API.Controllers;

[ApiController]
[Route("api/payment")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICreditAccountRepository _creditRepository;

    public PaymentController(IMediator mediator, ICreditAccountRepository creditRepository)
    {
        _mediator = mediator;
        _creditRepository = creditRepository;
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

    [HttpGet("dealers/{dealerId:guid}/credit-account")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetCreditAccount(Guid dealerId, CancellationToken ct)
    {
        var account = await _creditRepository.GetByDealerIdAsync(dealerId, ct);

        if (account is null)
        {
            return Ok(new CreditAccountDto(
                AccountId: Guid.Empty,
                DealerId: dealerId,
                CreditLimit: 500_000m,
                Outstanding: 0m,
                Available: 500_000m,
                Utilization: 0,
                LastUpdatedAt: null
            ));
        }

        var utilization = account.CreditLimit > 0
            ? (int)Math.Round(account.CurrentOutstanding / account.CreditLimit * 100)
            : 0;

        return Ok(new CreditAccountDto(
            AccountId: account.AccountId,
            DealerId: account.DealerId,
            CreditLimit: account.CreditLimit,
            Outstanding: account.CurrentOutstanding,
            Available: account.AvailableCredit,
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

