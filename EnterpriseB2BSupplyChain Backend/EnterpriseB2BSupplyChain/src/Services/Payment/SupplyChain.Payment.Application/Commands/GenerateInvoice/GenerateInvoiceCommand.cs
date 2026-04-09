using MediatR;

namespace SupplyChain.Payment.Application.Commands.GenerateInvoice;

public record InvoiceLineRequest(
    Guid    ProductId,
    string  ProductName,
    string  SKU,
    int     Quantity,
    decimal UnitPrice
);

public record GenerateInvoiceCommand(
    Guid                     OrderId,
    Guid                     DealerId,
    decimal                  TotalAmount,
    string                   PaymentMode,
    bool                     IsInterstate,
    List<InvoiceLineRequest> Lines
) : IRequest<Guid>;
