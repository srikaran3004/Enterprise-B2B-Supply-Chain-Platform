using MediatR;
using SupplyChain.Payment.Application.DTOs;

namespace SupplyChain.Payment.Application.Queries.GetInvoiceById;

public record GetInvoiceByIdQuery(Guid InvoiceId) : IRequest<InvoiceDto>;
