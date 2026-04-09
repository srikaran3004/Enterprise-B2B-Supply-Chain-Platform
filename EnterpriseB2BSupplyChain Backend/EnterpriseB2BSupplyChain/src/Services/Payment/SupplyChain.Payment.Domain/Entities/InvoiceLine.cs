namespace SupplyChain.Payment.Domain.Entities;

public class InvoiceLine
{
    public Guid    LineId        { get; private set; }
    public Guid    InvoiceId     { get; private set; }
    public string  ProductName   { get; private set; } = string.Empty;
    public string  SKU           { get; private set; } = string.Empty;
    public int     Quantity      { get; private set; }
    public decimal UnitPrice     { get; private set; }
    public decimal LineTotal     { get; private set; }

    public Invoice Invoice { get; private set; } = null!;

    private InvoiceLine() { }

    public static InvoiceLine Create(
        Guid    invoiceId,
        string  productName,
        string  sku,
        int     quantity,
        decimal unitPrice)
        => new()
        {
            LineId      = Guid.NewGuid(),
            InvoiceId   = invoiceId,
            ProductName = productName,
            SKU         = sku,
            Quantity    = quantity,
            UnitPrice   = unitPrice,
            LineTotal   = quantity * unitPrice
        };
}
