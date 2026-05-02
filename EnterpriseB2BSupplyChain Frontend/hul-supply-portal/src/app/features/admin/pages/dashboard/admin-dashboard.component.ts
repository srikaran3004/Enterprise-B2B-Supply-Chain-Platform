import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { InventoryViewService } from '../../../../core/services/inventory-view.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Admin Dashboard" subtitle="Overview of your supply chain operations"></hul-page-header>

      <!-- KPI Row 1 -->
      <div class="kpi-grid">
        <hul-stat-card title="Pending Dealers" [value]="stats.pendingDealers" subtitle="+{{stats.pendingDealersWeek}} this week" icon="user-clock" iconColor="amber" trend="up" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Active Dealers" [value]="stats.activeDealers" icon="users" iconColor="blue" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Orders Today" [value]="stats.ordersToday" icon="shopping-cart" iconColor="green" trend="up" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Revenue This Month" [value]="'₹' + formatNum(stats.revenueMonth)" icon="trending-up" iconColor="purple" [loading]="loading"></hul-stat-card>
      </div>

      <!-- KPI Row 2 -->
      <div class="kpi-grid" style="margin-top:14px">
        <hul-stat-card title="In Transit" [value]="stats.inTransit" icon="truck" iconColor="blue" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="On Hold" [value]="stats.onHold" icon="pause-circle" iconColor="amber" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Low Stock Products" [value]="stats.lowStock" icon="alert-triangle" iconColor="red" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Invoices Generated" [value]="stats.invoicesMonth" icon="receipt" iconColor="teal" [loading]="loading"></hul-stat-card>
      </div>

      <!-- Two-column section -->
      <div class="dashboard-row">
        <!-- Pending Approvals Quick Panel -->
        <div class="dashboard-card dashboard-card--approvals">
          <div class="card-header">
            <h3>Pending Dealer Approvals</h3>
            <a routerLink="/admin/dealers/pending" class="card-link">Review all →</a>
          </div>
          <div *ngIf="!loading && pendingDealers.length === 0" class="card-empty">No pending approvals 🎉</div>
          <div *ngFor="let dealer of pendingDealers.slice(0, 5)" class="approval-row" routerLink="/admin/dealers/pending">
            <hul-avatar [name]="dealer.fullName" size="sm"></hul-avatar>
            <div class="approval-row__info">
              <span class="approval-row__name">{{ dealer.fullName }}</span>
              <span class="approval-row__city">{{ dealer.city }}, {{ dealer.state }}</span>
            </div>
            <span class="approval-row__date">{{ dealer.createdAt | date:'mediumDate' }}</span>
          </div>
          <a *ngIf="pendingDealers.length > 5" routerLink="/admin/dealers/pending" class="card-footer-link">+ {{ pendingDealers.length - 5 }} more pending</a>
        </div>

        <!-- Recent Orders -->
        <div class="dashboard-card dashboard-card--orders">
          <div class="card-header">
            <h3>Recent Orders</h3>
            <a routerLink="/admin/orders" class="card-link">View all →</a>
          </div>
          <div class="mini-table-wrap">
            <table class="mini-table">
              <thead>
                <tr><th>Order #</th><th>Dealer</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let order of recentOrders.slice(0, 8)">
                  <td class="mono">{{ order.orderNumber || order.orderId?.substring(0,8) }}</td>
                  <td>{{ order.dealerName || 'Dealer' }}</td>
                  <td class="font-display">₹{{ formatNum(order.totalAmount) }}</td>
                  <td><hul-status-badge [status]="order.status"></hul-status-badge></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!loading && recentOrders.length === 0" class="card-empty">No orders yet</div>
        </div>
      </div>

      <!-- Low Stock Alerts -->
      <div *ngIf="lowStockProducts.length > 0" class="low-stock-alert">
        <div class="low-stock-alert__header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{{ lowStockProducts.length }} products are low on stock</span>
          <a routerLink="/admin/inventory" class="card-link">Manage Inventory →</a>
        </div>
        <div class="low-stock-list">
          <div *ngFor="let p of lowStockProducts.slice(0, 5)" class="low-stock-item">
            <span class="low-stock-item__name">{{ p.name }}</span>
            <span class="low-stock-item__sku mono">{{ p.sku }}</span>
            <span class="low-stock-item__stock" [class.critical]="p.availableStock < 20">{{ p.availableStock }} units</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
    @media (max-width: 1280px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-grid hul-stat-card, .kpi-grid .stat-card-wrapper { height: 100%; display: flex; flex-direction: column; }
    .dashboard-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    @media (max-width: 900px) { .dashboard-row { grid-template-columns: 1fr; } }
    .dashboard-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; font-family: var(--font-display); }
    .card-link { font-size: 13px; color: var(--hul-primary); font-weight: 500; text-decoration: none; }
    .card-link:hover { text-decoration: underline; }
    .card-empty { text-align: center; padding: 32px 16px; color: var(--text-tertiary); font-size: 14px; }
    .approval-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-default); cursor: pointer; border-radius: var(--radius-sm); transition: background var(--duration-fast); text-decoration: none; }
    .approval-row:hover { background: var(--bg-muted); }
    .approval-row:last-child { border-bottom: none; }
    .approval-row__info { flex: 1; display: flex; flex-direction: column; }
    .approval-row__name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .approval-row__city { font-size: 12px; color: var(--text-tertiary); }
    .approval-row__date { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }
    .card-footer-link { display: block; text-align: center; padding: 12px 0 0; font-size: 13px; color: var(--hul-primary); font-weight: 500; text-decoration: none; }
    .card-footer-link:hover { text-decoration: underline; }
    .mini-table-wrap { overflow-x: auto; }
    .mini-table { width: 100%; border-collapse: collapse; }
    .mini-table th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-default); }
    .mini-table td { font-size: 13px; color: var(--text-primary); padding: 8px 12px; border-bottom: 1px solid var(--border-default); }
    .mono { font-family: var(--font-mono); font-size: 12px; }
    .font-display { font-family: var(--font-display); font-weight: 600; }
    .low-stock-alert { margin-top: 24px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: var(--radius-lg); padding: 16px 20px; }
    :host-context(.dark) .low-stock-alert { background: rgba(217,119,6,.08); border-color: rgba(217,119,6,.3); }
    .low-stock-alert__header { display: flex; align-items: center; gap: 8px; color: #d97706; font-weight: 600; font-size: 14px; margin-bottom: 12px; }
    .low-stock-list { display: flex; flex-direction: column; gap: 6px; }
    .low-stock-item { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    .low-stock-item__name { flex: 1; font-size: 13px; color: var(--text-primary); }
    .low-stock-item__sku { font-size: 12px; color: var(--text-tertiary); }
    .low-stock-item__stock { font-size: 13px; font-weight: 600; color: #d97706; }
    .low-stock-item__stock.critical { color: #ef4444; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  stats = {
    pendingDealers: 0, pendingDealersWeek: 0, activeDealers: 0,
    ordersToday: 0, revenueMonth: 0, inTransit: 0, onHold: 0,
    lowStock: 0, invoicesMonth: 0
  };
  pendingDealers: any[] = [];
  recentOrders: any[] = [];
  lowStockProducts: any[] = [];

  constructor(private http: ZoneHttpService, private inventoryView: InventoryViewService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load pending dealers
    this.http.get<any[]>(API_ENDPOINTS.admin.dealers() + '?status=Pending').subscribe({
      next: dealers => { 
        this.pendingDealers = Array.isArray(dealers) ? dealers : []; 
        this.stats.pendingDealers = this.pendingDealers.length; 
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Load all dealers for active count
    this.http.get<any[]>(API_ENDPOINTS.admin.dealers() + '?status=Active').subscribe({
      next: dealers => { 
        this.stats.activeDealers = Array.isArray(dealers) ? dealers.length : 0; 
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Load products for low stock
    this.inventoryView.getInventorySnapshot().subscribe({
      next: products => {
        const productsArr = Array.isArray(products) ? products : [];
        this.lowStockProducts = productsArr.filter((p: any) => (p.availableStock || 0) < 50).sort((a: any, b: any) => (a.availableStock || 0) - (b.availableStock || 0));
        this.stats.lowStock = this.lowStockProducts.length;
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Load orders - API returns PagedResult { items: [], totalCount: N }
    this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=100').subscribe({
      next: response => {
        try {
          const ordersArr = Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []);
          this.recentOrders = ordersArr.slice(0, 10);
          const today = new Date().toISOString().split('T')[0];
          this.stats.ordersToday = ordersArr.filter((o: any) => (o.createdAt || o.placedAt)?.startsWith(today)).length;
          this.stats.revenueMonth = ordersArr.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
          this.stats.inTransit = ordersArr.filter((o: any) => o.status === 'InTransit').length;
          this.stats.onHold = ordersArr.filter((o: any) => o.status === 'OnHold').length;
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => { 
        this.loading = false; 
        this.cdr.detectChanges();
      }
    });

    // Load invoices for count
    this.http.get<any[]>(API_ENDPOINTS.payment.invoices()).subscribe({
      next: invoices => {
        const invoicesArr = Array.isArray(invoices) ? invoices : [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        this.stats.invoicesMonth = invoicesArr.filter((inv: any) => {
          const genDate = new Date(inv.generatedAt || inv.createdAt);
          return genDate >= startOfMonth;
        }).length;
        
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }



  formatNum(val: number): string {
    if (!val) return '0';
    return val.toLocaleString('en-IN');
  }
}
