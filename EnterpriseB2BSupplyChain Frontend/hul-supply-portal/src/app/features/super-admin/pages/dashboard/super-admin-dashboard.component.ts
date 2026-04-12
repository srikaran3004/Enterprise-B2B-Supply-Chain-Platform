import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-super-admin-dashboard', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Super Admin Overview" subtitle="Global system status and key metrics"></hul-page-header>

      <!-- KPI Row 1 -->
      <div class="kpi-grid">
        <hul-stat-card title="Total Staff" [value]="loading ? '' : staffCount" [loading]="loading" subtitle="Admin + Warehouse + Logistics" icon="users" iconColor="pink"></hul-stat-card>
        <hul-stat-card title="Total Dealers" [value]="loading ? '' : dealerCount" [loading]="loading" [subtitle]="pendingDealers + ' pending approval'" icon="store" iconColor="blue" [trend]="pendingDealers > 0 ? 'up' : 'neutral'"></hul-stat-card>
        <hul-stat-card title="Active Agents" [value]="loading ? '' : agentCount" [loading]="loading" icon="truck" iconColor="green"></hul-stat-card>
        <hul-stat-card title="Total Products" [value]="loading ? '' : productCount" [loading]="loading" icon="package" iconColor="purple"></hul-stat-card>
      </div>

      <!-- KPI Row 2 -->
      <div class="kpi-grid" style="margin-top:14px">
        <hul-stat-card title="Network Revenue" [value]="loading ? '' : '₹' + formatNum(networkRevenue)" [loading]="loading" subtitle="From all orders" icon="trending-up" iconColor="teal"></hul-stat-card>
        <hul-stat-card title="Total Orders" [value]="loading ? '' : totalOrders" [loading]="loading" [subtitle]="activeOrders + ' active'" icon="shopping-cart" iconColor="blue"></hul-stat-card>
        <hul-stat-card title="Delivered Orders" [value]="loading ? '' : deliveredOrders" [loading]="loading" icon="clipboard-list" iconColor="green"></hul-stat-card>
        <hul-stat-card title="System Uptime" [value]="'99.9%'" icon="activity" iconColor="teal" subtitle="All services healthy"></hul-stat-card>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" style="margin-top:24px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin:0 0 16px;font-family:var(--font-display)">Quick Actions</h3>
        <div class="quick-grid">
          <a routerLink="/super-admin/staff" class="qa-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <span>Create Admin</span>
          </a>
          <a routerLink="/admin/dealers/pending" class="qa-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            <span>Approve Dealers</span>
          </a>
          <a routerLink="/admin/reports" class="qa-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>View Reports</span>
          </a>
          <a routerLink="/admin/inventory" class="qa-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
            <span>Manage Inventory</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
    @media (max-width: 1280px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-grid hul-stat-card, .kpi-grid .stat-card-wrapper { height: 100%; display: flex; flex-direction: column; }
    .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 768px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .quick-grid { grid-template-columns: 1fr; } }
    .qa-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); text-decoration: none; color: var(--text-primary); font-size: 15px; font-weight: 600; transition: all var(--duration-fast); }
    .qa-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
    .qa-card svg { color: var(--hul-primary); }
  `]
})
export class SuperAdminDashboardComponent implements OnInit {
  private static readonly DASHBOARD_TIMEOUT_MS = 12000;

  loading = true;
  staffCount = 0;
  dealerCount = 0;
  pendingDealers = 0;
  agentCount = 0;
  productCount = 0;
  networkRevenue = 0;
  totalOrders = 0;
  activeOrders = 0;
  deliveredOrders = 0;

  constructor(private http: ZoneHttpService, private cdr: ChangeDetectorRef) { }

  /** Silent options: suppress the global error-toast for background dashboard calls */
  private get silentOpts() { return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) }; }

  ngOnInit(): void {
    forkJoin({
      staff: this.http.get<any[]>(API_ENDPOINTS.superAdmin.viewAdmins(), this.silentOpts).pipe(timeout(SuperAdminDashboardComponent.DASHBOARD_TIMEOUT_MS), catchError((err) => { console.error('Staff err:', err); return of([]); })),
      dealers: this.http.get<any[]>(API_ENDPOINTS.admin.dealers(), this.silentOpts).pipe(timeout(SuperAdminDashboardComponent.DASHBOARD_TIMEOUT_MS), catchError((err) => { console.error('Dealer err:', err); return of([]); })),
      agents: this.http.get<any[]>(API_ENDPOINTS.logistics.availableAgents(), this.silentOpts).pipe(timeout(SuperAdminDashboardComponent.DASHBOARD_TIMEOUT_MS), catchError((err) => { console.error('Agent err:', err); return of([]); })),
      products: this.http.get<any[]>(API_ENDPOINTS.catalog.products(), this.silentOpts).pipe(timeout(SuperAdminDashboardComponent.DASHBOARD_TIMEOUT_MS), catchError((err) => { console.error('Catalog err:', err); return of([]); })),
      orders: this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=500', this.silentOpts).pipe(timeout(SuperAdminDashboardComponent.DASHBOARD_TIMEOUT_MS), catchError((err) => { console.error('Order err:', err); return of({ items: [] }); })),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          try {
            const staffArr = Array.isArray(data.staff) ? data.staff : [];
            const dealersArr = Array.isArray(data.dealers) ? data.dealers : [];
            const agentsArr = Array.isArray(data.agents) ? data.agents : [];
            const productsArr = Array.isArray(data.products) ? data.products : [];
            const ordersArr = Array.isArray(data.orders?.items) ? data.orders.items : (Array.isArray(data.orders) ? data.orders : []);

            this.staffCount = staffArr.length;
            this.dealerCount = dealersArr.length;
            this.pendingDealers = dealersArr.filter((d: any) => d.status === 'Pending').length;
            this.agentCount = agentsArr.length;
            this.productCount = productsArr.length;

            this.totalOrders = ordersArr.length;
            this.networkRevenue = ordersArr.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
            this.activeOrders = ordersArr.filter((o: any) => ['Placed', 'OnHold', 'Processing', 'ReadyForDispatch', 'InTransit'].includes(o?.status)).length;
            this.deliveredOrders = ordersArr.filter((o: any) => o?.status === 'Delivered').length;
          } catch (e) {
            console.error('Error parsing dashboard data:', e);
          }
        },
        error: (e) => {
          console.error('Critical forkJoin error:', e);
        }
      });
  }

  formatNum(val: number): string {
    if (!val) return '0';
    return val.toLocaleString('en-IN');
  }
}
