using SupplyChain.Payment.Domain.Exceptions;

namespace SupplyChain.Payment.Domain.Entities;

public class Invoice
{
    public Guid    InvoiceId       { get; private set; }
    public string  InvoiceNumber   { get; private set; } = string.Empty;
    public Guid    OrderId         { get; private set; }
    public Guid    DealerId        { get; private set; }
    public string  IdempotencyKey  { get; private set; } = string.Empty;
    public decimal Subtotal        { get; private set; }
    public string  GstType         { get; private set; } = string.Empty;
    public decimal GstRate         { get; private set; }
    public decimal GstAmount       { get; private set; }
    public decimal GrandTotal      { get; private set; }
    public string  PaymentMode     { get; private set; } = string.Empty;
    public string? PdfStoragePath  { get; private set; }
    public DateTime GeneratedAt    { get; private set; }
    public bool    IsSentToDealer  { get; private set; }

    public ICollection<InvoiceLine> Lines { get; private set; } = new List<InvoiceLine>();

    private Invoice() { }

    public static Invoice Create(
        Guid               orderId,
        Guid               dealerId,
        string             invoiceNumber,
        string             idempotencyKey,
        List<InvoiceLine>  lines,
        bool               isInterstate,
        string             paymentMode)
    {
        var subtotal  = lines.Sum(l => l.LineTotal);
        var gstRate   = 18m;
        var gstType   = isInterstate ? "IGST" : "CGST+SGST";
        var gstAmount = Math.Round(subtotal * gstRate / 100, 2);

        var invoice = new Invoice
        {
            InvoiceId      = Guid.NewGuid(),
            InvoiceNumber  = invoiceNumber,
            OrderId        = orderId,
            DealerId       = dealerId,
            IdempotencyKey = idempotencyKey,
            Subtotal       = subtotal,
            GstType        = gstType,
            GstRate        = gstRate,
            GstAmount      = gstAmount,
            GrandTotal     = subtotal + gstAmount,
            PaymentMode    = paymentMode,
            GeneratedAt    = DateTime.UtcNow,
            IsSentToDealer = false
        };

        foreach (var line in lines)
            invoice.Lines.Add(line);

        return invoice;
    }

    public void SetPdfPath(string path)
    {
        PdfStoragePath = path;
    }

    public void MarkSentToDealer()
    {
        IsSentToDealer = true;
    }
}
