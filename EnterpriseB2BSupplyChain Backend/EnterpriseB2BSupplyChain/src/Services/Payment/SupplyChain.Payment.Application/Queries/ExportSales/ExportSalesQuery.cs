using MediatR;

namespace SupplyChain.Payment.Application.Queries.ExportSales;

public record ExportSalesQuery() : IRequest<ExportSalesResult>;

public record ExportSalesResult(byte[] FileBytes, string FileName, string ContentType);
