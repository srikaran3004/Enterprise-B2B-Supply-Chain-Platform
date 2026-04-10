import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-invoices',
  standalone: false,
  template: `
    <div class="invoices-page">
      <hul-page-header title="Invoices" subtitle="View and download your GST invoices"
        [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Invoices'}]">
      </hul-page-header>

      <hul-skeleton *ngIf="loading" type="table" [count]="5"></hul-skeleton>

      <div class="invoices-table" *ngIf="!loading && invoices.length > 0">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Order #</th>
              <th>Date</th>
              <th>GST Type</th>
              <th>Grand Total</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let inv of invoices" class="invoice-row">
              <td class="mono">{{ inv.invoiceNumber }}</td>
              <td><a [routerLink]="['/dealer/orders', inv.orderId]" class="order-link">View Order</a></td>
              <td>{{ inv.generatedAt | date:'dd MMM yyyy' }}</td>
              <td><hul-badge [variant]="inv.gstType === 'IGST' ? 'info' : 'primary'" size="sm">{{ inv.gstType }}</hul-badge></td>
              <td class="mono bold">{{ inv.grandTotal | inrCurrency }}</td>
              <td>
                <button class="download-btn" (click)="download(inv)" title="Download PDF">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hul-empty-state *ngIf="!loading && invoices.length === 0"
        icon="receipt" title="No invoices yet"
        description="Invoices will appear here once your orders are processed">
      </hul-empty-state>
    </div>
  `,
  styles: [`
    .invoices-page { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .invoices-table {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      overflow-x: auto;
    }

    table { width: 100%; border-collapse: collapse; }
    th { background: var(--bg-subtle); padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; text-align: left; border-bottom: 1px solid var(--border-default); }
    td { padding: 14px 16px; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--border-default); }
    .invoice-row:hover { background: var(--bg-subtle); }
    .invoice-row:last-child td { border-bottom: none; }
    .mono { font-family: var(--font-mono); }
    .bold { font-weight: 600; }
    .order-link { color: var(--hul-primary); font-weight: 600; text-decoration: none; }

    .download-btn {
      background: none;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 6px;
      cursor: pointer;
      color: var(--text-tertiary);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .download-btn:hover {
      border-color: var(--hul-primary);
      color: var(--hul-primary);
      background: var(--hul-primary-light);
    }
  `]
})
export class InvoicesComponent implements OnInit {
  invoices: any[] = [];
  loading = true;

  constructor(private http: ZoneHttpService) { }

  ngOnInit() {
    this.http.get<any>(API_ENDPOINTS.payment.invoices()).subscribe({
      next: (data) => {
        const payload = data?.items || data?.Items || data || [];
        this.invoices = Array.isArray(payload) ? payload : [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  download(inv: any): void {
    const invoiceId = inv.invoiceId || inv.InvoiceId || inv.id || inv.Id;
    if (!invoiceId) {
      return;
    }

    this.http.get<Blob>(API_ENDPOINTS.payment.downloadInvoice(invoiceId), { responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNumber || inv.InvoiceNumber || 'invoice'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }
}
