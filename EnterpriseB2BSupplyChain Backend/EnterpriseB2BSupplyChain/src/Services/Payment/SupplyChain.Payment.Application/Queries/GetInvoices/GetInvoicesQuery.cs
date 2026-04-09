using MediatR;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.GetInvoices;

public record GetInvoicesQuery(Guid? DealerId = null) : IRequest<List<InvoiceSummaryDto>>;
