import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-logistics-dashboard', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Logistics Dashboard" subtitle="Monitor deliveries and agent assignments"></hul-page-header>
      <div class="kpi-grid">
        <hul-stat-card title="Pending Assignment" [value]="pendingCount" icon="truck" iconColor="amber" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Active Deliveries" [value]="activeCount" icon="map-pin" iconColor="blue" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Delivered Today" [value]="deliveredToday" icon="package" iconColor="green" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="SLA At Risk" [value]="slaAtRisk" icon="clock" iconColor="red" [loading]="loading"></hul-stat-card>
      </div>
      <!-- Map Placeholder -->
      <div class="map-placeholder" style="margin-top:24px">
        <div class="map-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <h3>Active Deliveries — Live Map</h3>
          <p>Live map coming soon. Tracking available per order.</p>
        </div>
      </div>
      <!-- Recent Assignments -->
      <div class="section-card" style="margin-top:24px">
        <h3>Recent Agent Assignments</h3>
        <div *ngIf="recentShipments.length === 0" class="empty">No recent assignments.</div>
        <table *ngIf="recentShipments.length > 0" class="mini-table">
          <thead><tr><th>Order</th><th>Agent</th><th>Vehicle</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let s of recentShipments.slice(0,10)">
              <td class="mono">{{ s.orderId?.substring(0,8) }}</td>
              <td>{{ s.agentName || 'Unassigned' }}</td>
              <td>{{ s.vehicleRegistrationNo || '—' }}</td>
              <td><hul-status-badge [status]="s.status"></hul-status-badge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; } @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .map-placeholder { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .map-inner { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; text-align: center; }
    .map-inner h3 { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 16px 0 8px; font-family: var(--font-display); }
    .map-inner p { color: var(--text-tertiary); font-size: 14px; margin: 0; }
    .section-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px; }
    .section-card h3 { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: var(--text-primary); font-family: var(--font-display); }
    .empty { text-align: center; padding: 32px; color: var(--text-tertiary); font-size: 14px; }
    .mini-table { width: 100%; border-collapse: collapse; }
    .mini-table th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); padding: 8px; text-align: left; border-bottom: 1px solid var(--border-default); }
    .mini-table td { font-size: 13px; color: var(--text-primary); padding: 10px 8px; border-bottom: 1px solid var(--border-default); }
    .mono { font-family: var(--font-mono); }
  `]
})
export class LogisticsDashboardComponent implements OnInit {
  loading = true; pendingCount = 0; activeCount = 0; deliveredToday = 0; slaAtRisk = 0; recentShipments: any[] = [];
  constructor(private http: ZoneHttpService) {}
  ngOnInit(): void {
    // pendingShipments now returns all active (Pending → OutForDelivery)
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: active => {
        this.pendingCount  = active.filter(x => x.status === 'Pending').length;
        this.activeCount   = active.filter(x => ['AgentAssigned','PickedUp','InTransit','OutForDelivery'].includes(x.status)).length;
        this.slaAtRisk     = active.filter(x => x.slaAtRisk).length;
        this.recentShipments = active.filter(x => x.agentName).slice(0, 10);
        this.loading = false;
      },
      error: () => this.loading = false
    });
    // Fetch delivered-today count from the full shipments list
    this.http.get<any[]>(API_ENDPOINTS.logistics.shipments()).subscribe({
      next: all => {
        const today = new Date().toISOString().split('T')[0];
        this.deliveredToday = all.filter(x => x.status === 'Delivered' && x.deliveredAt?.startsWith(today)).length;
      },
      error: () => {}
    });
  }
}
