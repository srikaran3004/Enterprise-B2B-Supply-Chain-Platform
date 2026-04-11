namespace SupplyChain.Payment.Application.DTOs;

public record InvoiceSummaryDto(
    Guid     InvoiceId,
    string   InvoiceNumber,
    Guid     OrderId,
    decimal  GrandTotal,
    string   GstType,
    string   PaymentMode,
    DateTime GeneratedAt,
    bool     IsSentToDealer,
    string?  PaymentStatus,
    string?  PaymentMethod,
    string?  PaymentReference,
    DateTime? PaidAt
);
