import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';
import { OrderSummary, PagedResponse } from '../../../../core/models/api-models';
import { OrderStatus } from '../../../../core/models/status.enums';

@Component({
  selector: 'app-admin-orders', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="All Orders" subtitle="Manage and track all orders across dealers">
        <button page-actions class="btn-export" (click)="exportCsv()" title="Export current view to CSV">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </hul-page-header>

      <!-- Summary Stats -->
      <div class="order-stats">
        <div class="order-stat" *ngFor="let stat of summaryStats">
          <span class="order-stat__label">{{ stat.label }}</span>
          <span class="order-stat__value" [style.color]="stat.color">{{ stat.value }}</span>
        </div>
      </div>

      <hul-tabs [tabs]="tabsWithCounts" [activeTab]="activeTab" (tabChange)="onTabChange($event)"></hul-tabs>
      <div class="order-filters">
        <div class="order-filters__group">
          <label>From</label>
          <input type="date" [(ngModel)]="dateFrom" (change)="onDateFilterChange()" class="order-filters__input" />
        </div>
        <div class="order-filters__group">
          <label>To</label>
          <input type="date" [(ngModel)]="dateTo" (change)="onDateFilterChange()" class="order-filters__input" />
        </div>
        <button class="order-filters__clear" (click)="clearDateFilters()" [disabled]="!dateFrom && !dateTo">Clear Dates</button>
      </div>
      <div style="margin-top:20px">
        <hul-data-table [columns]="tableColumns" [data]="pagedOrders" [loading]="loading" [totalCount]="filtered.length"
           [currentPage]="currentPage" [pageSize]="pageSize" searchPlaceholder="Search by order number or dealer..."
           emptyMessage="No orders found" [actions]="tableActions"
           (searchChange)="onSearch($event)" (rowAction)="onAction($event)" (pageChange)="onPageChange($event)">
        </hul-data-table>
      </div>
    </div>
  `,
  styles: [`
    /* Summary stats bar */
    .order-stats {
      display: flex; gap: 24px; flex-wrap: wrap; padding: 12px 16px;
      background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-default);
      margin-bottom: 16px; box-shadow: var(--shadow-card);
    }
    .order-stat { display: flex; flex-direction: column; gap: 2px; min-width: 80px; }
    .order-stat__label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
    .order-stat__value { font-size: 20px; font-weight: 700; font-family: var(--font-display); color: var(--text-primary); }

    /* Export button */
    .btn-export {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px;
      border-radius: var(--radius-lg); border: 1px solid var(--border-default); background: var(--bg-card);
      color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: var(--font-body); transition: all 100ms ease;
    }
    .btn-export:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--bg-muted); }

    .order-filters { margin-top: 14px; display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
    .order-filters__group { display: flex; flex-direction: column; gap: 6px; }
    .order-filters__group label { font-size: 12px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
    .order-filters__input { min-width: 160px; padding: 8px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body); }
    .order-filters__input:focus { outline: none; border-color: var(--border-focus); }
    .order-filters__clear { padding: 8px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 12px; font-weight: 600; }
    .order-filters__clear:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class AdminOrdersComponent implements OnInit {
  loading = true;
  orders: OrderSummary[] = [];
  filtered: OrderSummary[] = [];
  pagedOrders: OrderSummary[] = [];
  searchTerm = '';
  activeTab = 'All';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  pageSize = 10;

  readonly tabDefs: { label: string; value: string }[] = [
    { label: 'All',               value: 'All' },
    { label: 'Incomplete Payments', value: OrderStatus.PaymentPending },
    { label: 'Placed',            value: OrderStatus.Placed },
    { label: 'On Hold',           value: OrderStatus.OnHold },
    { label: 'Processing',        value: OrderStatus.Processing },
    { label: 'Ready to Ship',     value: OrderStatus.ReadyForDispatch },
    { label: 'In Transit',        value: OrderStatus.InTransit },
    { label: 'Delivered',         value: OrderStatus.Delivered },
    { label: 'Cancelled',         value: OrderStatus.Cancelled },
  ];

  tabsWithCounts: { label: string; value: string; count?: number }[] = [];

  summaryStats: { label: string; value: string; color?: string }[] = [];

  get tableColumns(): DataTableColumn[] {
    const cols: DataTableColumn[] = [
      { key: 'orderNumber', label: 'Order #', type: 'text', sortable: true },
      { key: 'dealerName', label: 'Dealer', type: 'text' },
      { key: 'totalAmount', label: 'Total', type: 'currency-inr', sortable: true },
      { key: 'paymentMode', label: 'Payment', type: 'badge', badgeMap: { 'Credit': 'info', 'COD': 'warning', 'Prepaid': 'success' } },
      { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'PaymentPending': 'warning', 'Placed': 'info', 'OnHold': 'warning', 'Processing': 'primary', 'ReadyForDispatch': 'success', 'InTransit': 'info', 'Delivered': 'success', 'Cancelled': 'danger' } }
    ];

    if (this.activeTab === OrderStatus.OnHold || this.activeTab === 'All') {
      cols.push({ key: 'paymentStatus', label: 'Pay Status', type: 'badge', badgeMap: { 'Paid': 'success', 'Pending': 'warning', 'Failed': 'danger' } });
    }

    cols.push({ key: 'placedAt', label: 'Date', type: 'date', sortable: true });
    cols.push({ key: 'actions', label: 'Actions', type: 'actions-menu' });

    return cols;
  }
  tableActions: DataTableAction[] = [
    { key: 'view', label: 'View' },
    {
      key: 'approve',
      label: 'Approve',
      variant: 'primary',
      condition: (row: OrderSummary) => row?.status === OrderStatus.Placed || (row?.status === OrderStatus.OnHold && row?.paymentStatus === 'Paid')
    },
    {
      key: 'ready',
      label: 'Ready for Dispatch',
      variant: 'primary',
      condition: (row: OrderSummary) => row?.status === OrderStatus.Processing
    }
  ];

  constructor(private http: ZoneHttpService, private router: Router, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<PagedResponse<OrderSummary>>(API_ENDPOINTS.orders.base() + '?pageSize=200').subscribe({
      next: response => {
        this.orders = response.items || (response as unknown as OrderSummary[]) || [];
        this.buildTabCounts();
        this.buildSummaryStats();
        this.applyFilters();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  buildTabCounts(): void {
    this.tabsWithCounts = this.tabDefs.map(tab => ({
      ...tab,
      count: tab.value === 'All'
        ? this.orders.filter(o => o.status !== OrderStatus.PaymentPending).length
        : this.orders.filter(o => o.status === tab.value).length
    }));
  }

  buildSummaryStats(): void {
    const total   = this.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const onHold  = this.orders.filter(o => o.status === OrderStatus.OnHold).length;
    const delivered = this.orders.filter(o => o.status === OrderStatus.Delivered).length;
    const inTransit = this.orders.filter(o => o.status === OrderStatus.InTransit).length;
    const validOrders = this.orders.filter(o => o.status !== OrderStatus.PaymentPending).length;

    this.summaryStats = [
      { label: 'Total Orders', value: String(validOrders) },
      { label: 'Total Value',  value: '₹' + total.toLocaleString('en-IN') },
      { label: 'On Hold',   value: String(onHold),   color: onHold  > 0 ? 'var(--hul-warning)' : undefined },
      { label: 'In Transit',value: String(inTransit), color: inTransit > 0 ? 'var(--hul-primary)' : undefined },
      { label: 'Delivered', value: String(delivered), color: 'var(--hul-success)' },
    ];
  }

  onTabChange(tab: string): void { this.activeTab = tab; this.applyFilters(); }
  onSearch(term: string): void { this.searchTerm = term; this.applyFilters(); }
  onPageChange(page: number): void { this.currentPage = page; this.updatePagedOrders(); }
  onDateFilterChange(): void { this.applyFilters(); }
  clearDateFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let r = [...this.orders];
    if (this.activeTab === 'All') {
      r = r.filter(o => o.status !== OrderStatus.PaymentPending);
    } else {
      r = r.filter(o => o.status === this.activeTab);
    }
    
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      r = r.filter(o => o.orderNumber?.toLowerCase().includes(s) || o.dealerName?.toLowerCase().includes(s));
    }

    const fromDate = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`) : null;
    const toDate = this.dateTo ? new Date(`${this.dateTo}T23:59:59.999`) : null;
    if (fromDate || toDate) {
      r = r.filter(o => {
        const raw = o.placedAt || o.updatedAt;
        if (!raw) return false;
        const dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) return false;
        if (fromDate && dt < fromDate) return false;
        if (toDate && dt > toDate) return false;
        return true;
      });
    }

    this.filtered = r;
    this.currentPage = 1;
    this.updatePagedOrders();
  }

  private updatePagedOrders(): void {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.currentPage = Math.min(Math.max(this.currentPage, 1), totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedOrders = this.filtered.slice(start, start + this.pageSize);
  }

  onAction(e: { action: string; row: OrderSummary }): void {
    if (e.action === 'view') {
      this.router.navigate(['/admin/orders', e.row.orderId]);
      return;
    }

    if (e.action === 'approve') {
      this.http.put(API_ENDPOINTS.orders.approveOrder(e.row.orderId), {}).subscribe({
        next: () => {
          this.toast.success(`Order ${e.row.orderNumber} approved and moved to Processing`);
          this.load();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Failed to approve order')
      });
      return;
    }

    if (e.action === 'ready') {
      this.http.put(API_ENDPOINTS.orders.readyForDispatch(e.row.orderId), {}).subscribe({
        next: () => {
          this.toast.success(`Order ${e.row.orderNumber} marked as Ready for Dispatch`);
          this.load();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Failed to mark order ready for dispatch')
      });
    }
  }

  // ===== CSV Export =====
  exportCsv(): void {
    if (this.filtered.length === 0) { this.toast.error('No orders to export'); return; }

    const headers = ['Order #', 'Dealer', 'Total (INR)', 'Payment Mode', 'Status', 'Date'];
    const rows = this.filtered.map(o => [
      o.orderNumber || '',
      o.dealerName || '',
      o.totalAmount?.toFixed(2) || '0',
      o.paymentMode || '',
      o.status || '',
      o.placedAt ? new Date(o.placedAt).toLocaleDateString('en-IN') : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${this.activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${this.filtered.length} orders to CSV`);
  }
}
