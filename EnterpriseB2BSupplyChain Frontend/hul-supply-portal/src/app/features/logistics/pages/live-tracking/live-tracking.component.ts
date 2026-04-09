import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-live-tracking', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Live Tracking" subtitle="Monitor all active deliveries in real time"></hul-page-header>
      <hul-tabs [tabs]="tabs" [activeTab]="activeTab" (tabChange)="onTabChange($event)"></hul-tabs>
      <div class="tracking-grid" *ngIf="!loading">
        <div *ngIf="filtered.length === 0" class="empty" style="grid-column:1/-1">No active deliveries at the moment.</div>
        <div *ngFor="let s of filtered" class="tracking-card">
          <div class="tracking-card__header">
            <span class="mono">{{ s.orderId?.substring(0,8) }}</span>
            <hul-status-badge [status]="s.status"></hul-status-badge>
          </div>
          <div *ngIf="s.agentName" class="tracking-card__agent">
            <hul-avatar [name]="s.agentName" size="sm"></hul-avatar>
            <div><span class="agent-name">{{ s.agentName }}</span><span class="agent-phone">{{ s.agentPhone }}</span></div>
          </div>
          <div class="tracking-card__info">
            <div class="info-line"><span class="info-key">Vehicle</span><span>{{ s.vehicleRegistrationNo || '—' }}</span></div>
            <div class="info-line"><span class="info-key">SLA</span><span [class.sla-warn]="s.slaAtRisk">{{ s.slaDeadlineUtc | date:'mediumDate' }}</span></div>
          </div>
        </div>
      </div>
      <div *ngIf="loading" class="tracking-grid"><div *ngFor="let i of [1,2,3]" class="skeleton" style="height:200px;border-radius:var(--radius-lg)"></div></div>
    </div>
  `,
  styles: [`
    .tracking-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; } @media (max-width: 768px) { .tracking-grid { grid-template-columns: 1fr; } }
    .empty { text-align: center; padding: 48px; color: var(--text-tertiary); font-size: 14px; background: var(--bg-card); border-radius: var(--radius-lg); }
    .tracking-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px; }
    .tracking-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .mono { font-family: var(--font-mono); font-weight: 700; font-size: 15px; color: var(--text-primary); }
    .tracking-card__agent { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .agent-name { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .agent-phone { display: block; font-size: 12px; color: var(--text-tertiary); }
    .tracking-card__info { border-top: 1px solid var(--border-default); padding-top: 10px; }
    .info-line { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: var(--text-primary); }
    .info-key { color: var(--text-tertiary); }
    .sla-warn { color: #ef4444; font-weight: 600; }
  `]
})
export class LiveTrackingComponent implements OnInit {
  loading = true; shipments: any[] = []; filtered: any[] = []; activeTab = 'All';
  tabs = [{ label: 'All', value: 'All' }, { label: 'Picked Up', value: 'PickedUp' }, { label: 'In Transit', value: 'InTransit' }, { label: 'Out for Delivery', value: 'OutForDelivery' }];
  constructor(private http: ZoneHttpService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({ next: s => { this.shipments = s.filter(x => x.status !== 'Delivered'); this.applyFilter(); this.loading = false; }, error: () => this.loading = false }); }
  onTabChange(tab: string): void { this.activeTab = tab; this.applyFilter(); }
  applyFilter(): void { this.filtered = this.activeTab === 'All' ? [...this.shipments] : this.shipments.filter(s => s.status === this.activeTab); }
}
