using ClosedXML.Excel;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SupplyChain.Payment.Application.Queries.ExportSales;
using SupplyChain.Payment.Infrastructure.Persistence;

namespace SupplyChain.Payment.Infrastructure.QueryHandlers;

public class ExportSalesQueryHandler : IRequestHandler<ExportSalesQuery, ExportSalesResult>
{
    private readonly PaymentDbContext _context;

    public ExportSalesQueryHandler(PaymentDbContext context)
    {
        _context = context;
    }

    public async Task<ExportSalesResult> Handle(ExportSalesQuery request, CancellationToken ct)
    {
        var invoices = await _context.Invoices
            .Include(i => i.Lines)
            .OrderByDescending(i => i.GeneratedAt)
            .ToListAsync(ct);

        using var workbook = new XLWorkbook();

        // ── Sheet 1: Invoice Summary ──
        var summarySheet = workbook.Worksheets.Add("Invoice Summary");
        var summaryHeaders = new[]
        {
            "Invoice #", "Order ID", "Dealer ID", "Subtotal (₹)",
            "GST Type", "GST Rate (%)", "GST Amount (₹)", "Grand Total (₹)",
            "Payment Mode", "Generated At", "Sent to Dealer"
        };

        for (int i = 0; i < summaryHeaders.Length; i++)
            summarySheet.Cell(1, i + 1).Value = summaryHeaders[i];

        StyleHeaderRow(summarySheet, summaryHeaders.Length);

        int row = 2;
        foreach (var inv in invoices)
        {
            summarySheet.Cell(row, 1).Value = inv.InvoiceNumber;
            summarySheet.Cell(row, 2).Value = inv.OrderId.ToString();
            summarySheet.Cell(row, 3).Value = inv.DealerId.ToString();
            summarySheet.Cell(row, 4).Value = inv.Subtotal;
            summarySheet.Cell(row, 5).Value = inv.GstType;
            summarySheet.Cell(row, 6).Value = inv.GstRate;
            summarySheet.Cell(row, 7).Value = inv.GstAmount;
            summarySheet.Cell(row, 8).Value = inv.GrandTotal;
            summarySheet.Cell(row, 9).Value = inv.PaymentMode;
            summarySheet.Cell(row, 10).Value = inv.GeneratedAt.ToString("yyyy-MM-dd HH:mm");
            summarySheet.Cell(row, 11).Value = inv.IsSentToDealer ? "Yes" : "No";
            row++;
        }

        summarySheet.Columns().AdjustToContents();

        // ── Sheet 2: Line Items ──
        var linesSheet = workbook.Worksheets.Add("Line Items");
        var lineHeaders = new[]
        {
            "Invoice #", "Product Name", "SKU",
            "Quantity", "Unit Price (₹)", "Line Total (₹)"
        };

        for (int i = 0; i < lineHeaders.Length; i++)
            linesSheet.Cell(1, i + 1).Value = lineHeaders[i];

        StyleHeaderRow(linesSheet, lineHeaders.Length);

        row = 2;
        foreach (var inv in invoices)
        {
            foreach (var line in inv.Lines)
            {
                linesSheet.Cell(row, 1).Value = inv.InvoiceNumber;
                linesSheet.Cell(row, 2).Value = line.ProductName;
                linesSheet.Cell(row, 3).Value = line.SKU;
                linesSheet.Cell(row, 4).Value = line.Quantity;
                linesSheet.Cell(row, 5).Value = line.UnitPrice;
                linesSheet.Cell(row, 6).Value = line.LineTotal;
                row++;
            }
        }

        linesSheet.Columns().AdjustToContents();

        // ── Sheet 3: KPI Dashboard ──
        var kpiSheet = workbook.Worksheets.Add("KPI Summary");
        kpiSheet.Cell(1, 1).Value = "Metric";
        kpiSheet.Cell(1, 2).Value = "Value";
        StyleHeaderRow(kpiSheet, 2);

        kpiSheet.Cell(2, 1).Value = "Total Invoices";
        kpiSheet.Cell(2, 2).Value = invoices.Count;

        kpiSheet.Cell(3, 1).Value = "Total Revenue (₹)";
        kpiSheet.Cell(3, 2).Value = invoices.Sum(i => i.GrandTotal);

        kpiSheet.Cell(4, 1).Value = "Total GST Collected (₹)";
        kpiSheet.Cell(4, 2).Value = invoices.Sum(i => i.GstAmount);

        kpiSheet.Cell(5, 1).Value = "Average Order Value (₹)";
        kpiSheet.Cell(5, 2).Value = invoices.Count > 0
            ? Math.Round(invoices.Average(i => i.GrandTotal), 2) : 0;

        kpiSheet.Cell(6, 1).Value = "Unique Dealers";
        kpiSheet.Cell(6, 2).Value = invoices.Select(i => i.DealerId).Distinct().Count();

        kpiSheet.Cell(7, 1).Value = "Total Items Sold";
        kpiSheet.Cell(7, 2).Value = invoices.SelectMany(i => i.Lines).Sum(l => l.Quantity);

        kpiSheet.Columns().AdjustToContents();

        // Serialize
        using var ms = new MemoryStream();
        workbook.SaveAs(ms);

        var fileName = $"SalesExport_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
        return new ExportSalesResult(
            ms.ToArray(),
            fileName,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    private static void StyleHeaderRow(IXLWorksheet sheet, int colCount)
    {
        var headerRange = sheet.Range(1, 1, 1, colCount);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.DarkBlue;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }
}
