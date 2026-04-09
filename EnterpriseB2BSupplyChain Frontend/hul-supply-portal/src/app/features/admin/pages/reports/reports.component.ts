import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-reports', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Reports" subtitle="Analytics and insights from your supply chain data">
        <div page-actions class="report-actions">
          <!-- Date Range Filter -->
          <div class="date-range">
            <label>From</label>
            <input type="date" [(ngModel)]="dateFrom" (change)="load()" class="date-input" />
            <label>To</label>
            <input type="date" [(ngModel)]="dateTo" (change)="load()" class="date-input" />
          </div>
          <button class="btn-export" (click)="exportExcel()" [disabled]="exporting">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {{ exporting ? 'Exporting...' : 'Export Excel' }}
          </button>
        </div>
      </hul-page-header>

      <!-- Summary KPIs -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi-card">
          <span class="kpi-card__value">{{ totalOrders }}</span>
          <span class="kpi-card__label">Total Orders</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value kpi-card__value--green">{{ deliveredOrders }}</span>
          <span class="kpi-card__label">Delivered</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value kpi-card__value--amber">{{ pendingOrders }}</span>
          <span class="kpi-card__label">In Progress</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value kpi-card__value--red">{{ cancelledOrders }}</span>
          <span class="kpi-card__label">Cancelled</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value">{{ totalRevenue }}</span>
          <span class="kpi-card__label">Total Revenue (INR)</span>
        </div>
      </div>

      <div *ngIf="loading" class="skeleton-grid"><div *ngFor="let i of [1,2,3,4,5,6]" class="skeleton" style="height:300px;border-radius:var(--radius-lg)"></div></div>

      <div *ngIf="!loading" class="reports-grid">
        <!-- Orders by Status -->
        <div class="report-card">
          <h3>Orders by Status</h3>
          <div class="chart-placeholder">
            <div *ngFor="let s of statusData" class="bar-row">
              <span class="bar-label">{{ s.label }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="s.pct" [style.background]="s.color"></div></div>
              <span class="bar-value">{{ s.count }}</span>
            </div>
            <div *ngIf="statusData.length === 0" class="chart-empty">No order data available</div>
          </div>
        </div>

        <!-- Top Dealers -->
        <div class="report-card">
          <h3>Top Dealers by Order Value</h3>
          <div class="chart-placeholder">
            <div *ngFor="let d of topDealers" class="bar-row">
              <span class="bar-label">{{ d.name }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="d.pct" style="background:var(--hul-primary)"></div></div>
              <span class="bar-value">{{ formatCurrency(d.total) }}</span>
            </div>
            <div *ngIf="topDealers.length === 0" class="chart-empty">No dealer data</div>
          </div>
        </div>

        <!-- Top Products by Order Frequency -->
        <div class="report-card">
          <h3>Most Ordered Products</h3>
          <div class="chart-placeholder">
            <div *ngFor="let p of topProducts" class="bar-row">
              <span class="bar-label">{{ p.name }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="p.pct" style="background:#059669"></div></div>
              <span class="bar-value">{{ p.qty }} units</span>
            </div>
            <div *ngIf="topProducts.length === 0" class="chart-empty">No product line data available</div>
          </div>
        </div>

        <!-- Monthly Volume -->
        <div class="report-card">
          <h3>Monthly Order Volume</h3>
          <div class="chart-placeholder">
            <div *ngFor="let m of monthlyData" class="bar-row">
              <span class="bar-label">{{ m.label }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="m.pct" style="background:#7c3aed"></div></div>
              <span class="bar-value">{{ m.count }}</span>
            </div>
            <div *ngIf="monthlyData.length === 0" class="chart-empty">No monthly data</div>
          </div>
        </div>

        <!-- Monthly Revenue -->
        <div class="report-card">
          <h3>Monthly Revenue (INR)</h3>
          <div class="chart-placeholder">
            <div *ngFor="let m of monthlyRevenue" class="bar-row">
              <span class="bar-label">{{ m.label }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="m.pct" style="background:#0369a1"></div></div>
              <span class="bar-value">{{ formatCurrency(m.amount) }}</span>
            </div>
            <div *ngIf="monthlyRevenue.length === 0" class="chart-empty">No revenue data</div>
          </div>
        </div>

        <!-- Dealer Transaction Summary -->
        <div class="report-card report-card--wide">
          <h3>Dealer Transaction Summary</h3>
          <div class="dealer-table-wrap">
            <table class="dealer-table" *ngIf="dealerTransactions.length > 0">
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th class="text-right">Orders</th>
                  <th class="text-right">Total Value</th>
                  <th class="text-right">Delivered</th>
                  <th class="text-right">Cancelled</th>
                  <th class="text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let d of dealerTransactions">
                  <td>{{ d.name }}</td>
                  <td class="text-right">{{ d.orders }}</td>
                  <td class="text-right mono">{{ formatCurrency(d.total) }}</td>
                  <td class="text-right" style="color:#059669">{{ d.delivered }}</td>
                  <td class="text-right" style="color:#ef4444">{{ d.cancelled }}</td>
                  <td class="text-right mono">{{ formatCurrency(d.avgOrder) }}</td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="dealerTransactions.length === 0" class="chart-empty">No dealer transactions</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .date-range { display: flex; align-items: center; gap: 6px; }
    .date-range label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
    .date-input { padding: 6px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body); }
    .date-input:focus { outline: none; border-color: var(--border-focus); }

    .btn-export {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md);
      border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary);
      font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: all 100ms;
    }
    .btn-export:hover { border-color: var(--border-strong); background: var(--bg-muted); }
    .btn-export:disabled { opacity: .5; cursor: not-allowed; }

    /* KPI Row */
    .kpi-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .kpi-card { flex: 1; min-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-default); box-shadow: var(--shadow-card); }
    .kpi-card__value { font-size: 24px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .kpi-card__value--green { color: #059669; }
    .kpi-card__value--amber { color: #d97706; }
    .kpi-card__value--red { color: #ef4444; }
    .kpi-card__label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }

    .skeleton-grid, .reports-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .skeleton-grid, .reports-grid { grid-template-columns: 1fr; } .kpi-row { gap: 8px; } .kpi-card { min-width: 100px; } }
    .report-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px; border: 1px solid var(--border-default); }
    .report-card--wide { grid-column: 1 / -1; }
    .report-card h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 20px; font-family: var(--font-display); }
    .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .bar-label { width: 120px; font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .bar-track { flex: 1; height: 24px; background: var(--bg-muted); border-radius: var(--radius-md); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: var(--radius-md); transition: width 600ms var(--ease-out); min-width: 4px; }
    .bar-value { font-size: 13px; font-weight: 600; color: var(--text-primary); font-family: var(--font-display); min-width: 80px; text-align: right; }
    .chart-empty { padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px; }

    /* Dealer Table */
    .dealer-table-wrap { overflow-x: auto; }
    .dealer-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .dealer-table th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); border-bottom: 1px solid var(--border-default); }
    .dealer-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-default); color: var(--text-primary); }
    .dealer-table tbody tr:last-child td { border-bottom: none; }
    .dealer-table tbody tr:hover { background: var(--bg-muted); }
    .text-right { text-align: right !important; }
    .mono { font-family: var(--font-mono); }
  `]
})
export class ReportsComponent implements OnInit {
  loading = true;
  exporting = false;
  dateFrom = '';
  dateTo = '';

  // KPIs
  totalOrders = 0;
  deliveredOrders = 0;
  pendingOrders = 0;
  cancelledOrders = 0;
  totalRevenue = '';

  // Chart data
  statusData: any[] = [];
  topDealers: any[] = [];
  topProducts: any[] = [];
  monthlyData: any[] = [];
  monthlyRevenue: any[] = [];
  dealerTransactions: any[] = [];

  private statusColors: Record<string, string> = { 'Placed': '#2563eb', 'Processing': '#7c3aed', 'OnHold': '#d97706', 'ReadyForDispatch': '#0d9488', 'InTransit': '#0369a1', 'Delivered': '#059669', 'Cancelled': '#ef4444' };

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  ngOnInit(): void {
    // Default date range: last 6 months
    const now = new Date();
    this.dateTo = now.toISOString().slice(0, 10);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    this.dateFrom = sixMonthsAgo.toISOString().slice(0, 10);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=500').subscribe({
      next: response => {
        let orders = response.items || response || [];

        // Apply date range filter
        if (this.dateFrom || this.dateTo) {
          orders = orders.filter((o: any) => {
            const d = new Date(o.placedAt || o.createdAt || o.orderDate);
            if (this.dateFrom && d < new Date(this.dateFrom)) return false;
            if (this.dateTo && d > new Date(this.dateTo + 'T23:59:59')) return false;
            return true;
          });
        }

        // KPIs
        this.totalOrders = orders.length;
        this.deliveredOrders = orders.filter((o: any) => o.status === 'Delivered').length;
        this.cancelledOrders = orders.filter((o: any) => o.status === 'Cancelled').length;
        this.pendingOrders = orders.filter((o: any) => !['Delivered', 'Cancelled'].includes(o.status)).length;
        const revSum = orders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
        this.totalRevenue = this.formatCurrency(revSum);

        // Status distribution
        const statusMap: Record<string, number> = {};
        orders.forEach((o: any) => statusMap[o.status] = (statusMap[o.status] || 0) + 1);
        const maxStatus = Math.max(...Object.values(statusMap), 1);
        this.statusData = Object.entries(statusMap).map(([label, count]) => ({ label, count, pct: (count / maxStatus) * 100, color: this.statusColors[label] || '#6b7280' }));

        // Top dealers
        const dealerMap: Record<string, { name: string; total: number; orders: number; delivered: number; cancelled: number }> = {};
        orders.forEach((o: any) => {
          const name = o.dealerName || 'Unknown';
          if (!dealerMap[name]) dealerMap[name] = { name, total: 0, orders: 0, delivered: 0, cancelled: 0 };
          dealerMap[name].total += (o.totalAmount || 0);
          dealerMap[name].orders++;
          if (o.status === 'Delivered') dealerMap[name].delivered++;
          if (o.status === 'Cancelled') dealerMap[name].cancelled++;
        });
        const dealers = Object.values(dealerMap).sort((a, b) => b.total - a.total);
        const maxDealer = dealers[0]?.total || 1;
        this.topDealers = dealers.slice(0, 10).map(d => ({ ...d, pct: (d.total / maxDealer) * 100 }));

        // Dealer transactions table (all dealers)
        this.dealerTransactions = dealers.map(d => ({
          ...d,
          avgOrder: d.orders > 0 ? Math.round(d.total / d.orders) : 0
        }));

        // Monthly volume
        const monthMap: Record<string, number> = {};
        const monthRevMap: Record<string, number> = {};
        orders.forEach((o: any) => {
          const d = new Date(o.placedAt || o.createdAt || o.orderDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = (monthMap[key] || 0) + 1;
          monthRevMap[key] = (monthRevMap[key] || 0) + (o.totalAmount || 0);
        });
        const months = Object.entries(monthMap).sort().slice(-6);
        const maxMonth = Math.max(...months.map(m => m[1]), 1);
        this.monthlyData = months.map(([label, count]) => ({ label, count, pct: (count / maxMonth) * 100 }));

        const revMonths = Object.entries(monthRevMap).sort().slice(-6);
        const maxRev = Math.max(...revMonths.map(m => m[1]), 1);
        this.monthlyRevenue = revMonths.map(([label, amount]) => ({ label, amount, pct: (amount / maxRev) * 100 }));

        // Top products (from order lines)
        const prodMap: Record<string, { name: string; qty: number }> = {};
        orders.forEach((o: any) => {
          for (const line of (o.lines || o.items || [])) {
            const name = line.productName || line.name || line.sku || 'Unknown';
            const pid = line.productId || name;
            if (!prodMap[pid]) prodMap[pid] = { name, qty: 0 };
            prodMap[pid].qty += (line.quantity || 0);
          }
        });
        const prods = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 10);
        const maxProd = prods[0]?.qty || 1;
        this.topProducts = prods.map(p => ({ ...p, pct: (p.qty / maxProd) * 100 }));

        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  exportExcel(): void {
    this.exporting = true;
    this.http.get(API_ENDPOINTS.payment.salesExport(), { responseType: 'blob' as 'json' }).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Report exported successfully');
        this.exporting = false;
      },
      error: (err: any) => {
        this.toast.error(err.error?.error || 'Export failed. The sales export endpoint may not be available yet.');
        this.exporting = false;
      }
    });
  }

  formatCurrency(v: number): string {
    if (!v) return '0';
    return '₹' + v.toLocaleString('en-IN');
  }

  formatNum(v: number): string { return v ? v.toLocaleString('en-IN') : '0'; }
}
