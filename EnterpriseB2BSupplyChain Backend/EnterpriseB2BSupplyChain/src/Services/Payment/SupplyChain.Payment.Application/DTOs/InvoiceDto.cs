namespace SupplyChain.Payment.Application.DTOs;

public record InvoiceLineDto(
    string  ProductName,
    string  SKU,
    int     Quantity,
    decimal UnitPrice,
    decimal LineTotal
);

public record InvoiceDto(
    Guid                 InvoiceId,
    string               InvoiceNumber,
    Guid                 OrderId,
    Guid                 DealerId,
    decimal              Subtotal,
    string               GstType,
    decimal              GstRate,
    decimal              GstAmount,
    decimal              GrandTotal,
    string               PaymentMode,
    string?              PdfStoragePath,
    DateTime             GeneratedAt,
    List<InvoiceLineDto> Lines
);
